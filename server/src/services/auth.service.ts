import { PipelineStage } from 'mongoose';
import { UserModel } from '../models/User';
import { TaskModel } from '../models/Task';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { escapeRegExp } from '../utils/regex';
import {
  CreateUserInput,
  Paginated,
  UserListQuery,
  LoginInput,
  LoginResponse,
  UpdateUserInput,
  User,
  UserWithStats,
} from '../types';

export async function login({ email, password }: LoginInput): Promise<LoginResponse> {
  // password is select:false on the schema, so ask for it explicitly.
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');

  // Same message for "no such email" and "wrong password" — don't reveal which
  // emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Invalid email or password');
  }

  return {
    token: signToken(user._id.toString(), user.role),
    user: user.toDomain(),
  };
}

export async function getUserById(id: string): Promise<User> {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError(404, 'User not found');
  return user.toDomain();
}

/**
 * Assignee options for a picker: a searchable page rather than the whole
 * directory, so a large organisation does not ship thousands of rows to render
 * one dropdown.
 *
 * ensureIds keeps already-selected people in the result even when they fall
 * outside the current search, so a selection never renders as a bare id.
 */
export async function listAssignableUsers(
  search?: string,
  limit = 20,
  ensureIds: string[] = []
): Promise<Paginated<User>> {
  const capped = Math.min(50, Math.max(1, Math.floor(limit)));
  const match: Record<string, unknown> = {};

  if (search?.trim()) {
    const rx = new RegExp(escapeRegExp(search.trim()), 'i');
    match.$or = [{ name: rx }, { email: rx }];
  }

  const [found, total] = await Promise.all([
    UserModel.find(match).sort({ name: 1 }).limit(capped),
    UserModel.countDocuments(match),
  ]);

  const items = found.map((u) => u.toDomain());

  const missing = ensureIds.filter((id) => !items.some((u) => u.id === id));
  if (missing.length > 0) {
    const pinned = await UserModel.find({ _id: { $in: missing } });
    items.unshift(...pinned.map((u) => u.toDomain()));
  }

  return {
    items,
    meta: { page: 1, limit: capped, total, totalPages: Math.max(1, Math.ceil(total / capped)) },
  };
}

/**
 * Users with their task counts, searched, sorted and paged in the database.
 *
 * taskCount is a join, so sorting by it has to happen in the aggregation rather
 * than after the fact — otherwise a page would only be sorted within itself.
 */
export async function listUsersWithTaskCounts(
  query: UserListQuery = {}
): Promise<Paginated<UserWithStats>> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 10)));

  const match: Record<string, unknown> = {};

  if (query.search?.trim()) {
    const rx = new RegExp(escapeRegExp(query.search.trim()), 'i');
    match.$or = [{ name: rx }, { email: rx }];
  }

  if (query.role) match.role = query.role;

  const sortBy = query.sortBy ?? 'name';
  const direction = query.order === 'desc' ? -1 : 1;

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'assignedTo',
        as: 'assignedTasks',
      },
    },
    { $addFields: { taskCount: { $size: '$assignedTasks' } } },
    { $project: { assignedTasks: 0, password: 0 } },
    { $sort: { [sortBy]: direction, _id: 1 } },
  ];

  const [rows, total] = await Promise.all([
    UserModel.aggregate([...pipeline, { $skip: (page - 1) * limit }, { $limit: limit }]),
    UserModel.countDocuments(match),
  ]);

  const items: UserWithStats[] = rows.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    email: r.email,
    role: r.role,
    taskCount: r.taskCount,
  }));

  return {
    items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new AppError(409, 'A user with that email already exists');

  // create() (not insertMany) so the pre-save hook hashes the password.
  const user = await UserModel.create(input);
  return user.toDomain();
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError(404, 'User not found');

  if (input.email && input.email.toLowerCase() !== user.email) {
    const clash = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (clash) throw new AppError(409, 'A user with that email already exists');
    user.email = input.email;
  }

  if (input.name !== undefined) user.name = input.name;

  // Demoting the last admin would leave nobody able to manage tasks or restore
  // the role — an unrecoverable state without direct database access.
  if (input.role !== undefined && input.role !== user.role) {
    if (user.role === 'admin') {
      const admins = await UserModel.countDocuments({ role: 'admin' });
      if (admins <= 1) {
        throw new AppError(409, 'Cannot demote the only admin account');
      }
    }
    user.role = input.role;
  }
  if (input.password) user.password = input.password; // re-hashed by the hook

  await user.save();
  return user.toDomain();
}

/**
 * Deleting a user with assigned tasks is refused rather than cascading: those
 * tasks would be silently destroyed, or orphaned with a dangling assignedTo.
 * The admin must reassign them first.
 */
export async function deleteUser(actorId: string, id: string): Promise<void> {
  if (actorId === id) {
    throw new AppError(400, 'You cannot delete your own account');
  }

  const user = await UserModel.findById(id);
  if (!user) throw new AppError(404, 'User not found');

  const assigned = await TaskModel.countDocuments({ assignedTo: id });
  if (assigned > 0) {
    throw new AppError(
      409,
      `This user has ${assigned} assigned task${assigned === 1 ? '' : 's'}. Reassign them before deleting.`
    );
  }

  // Refuse to remove the last admin, which would lock everyone out.
  if (user.role === 'admin') {
    const admins = await UserModel.countDocuments({ role: 'admin' });
    if (admins <= 1) throw new AppError(409, 'Cannot delete the only admin account');
  }

  await user.deleteOne();
}
