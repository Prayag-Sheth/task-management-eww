import { Types } from 'mongoose';
import { UserModel } from '../models/User';
import { TaskModel } from '../models/Task';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import {
  CreateUserInput,
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

/** Assignee list for the admin's task form. */
export async function listUsers(): Promise<User[]> {
  const users = await UserModel.find().sort({ name: 1 });
  return users.map((u) => u.toDomain());
}

/** Users plus how many tasks each has, for the admin's user list. */
export async function listUsersWithTaskCounts(): Promise<UserWithStats[]> {
  const users = await UserModel.find().sort({ name: 1 });

  const counts = await TaskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  const byUser = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return users.map((u) => ({
    ...u.toDomain(),
    taskCount: byUser.get(u._id.toString()) ?? 0,
  }));
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
