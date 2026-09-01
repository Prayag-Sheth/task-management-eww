import { Types } from 'mongoose';
import { TaskModel } from '../models/Task';
import { UserModel, UserDocument } from '../models/User';
import { AppError } from '../utils/AppError';
import { escapeRegExp } from '../utils/regex';
import { emitTaskAssigned, emitTaskUpdated, emitTaskDeleted } from '../sockets';
import {
  CreateTaskInput,
  UpdateTaskInput,
  Role,
  Task,
  TaskListQuery,
  TaskListResult,
  TaskStatus,
  TaskStatusCounts,
} from '../types';

interface Actor {
  id: string;
  role: Role;
}

const MAX_LIMIT = 100;

/**
 * Admin sees every task; a user sees only their own. This scoping is the single
 * source of truth for read access — controllers never filter.
 *
 * Search, sort and pagination all run in MongoDB rather than in the client, so
 * the payload stays bounded however large the collection grows.
 */
export async function listTasks(
  actor: Actor,
  query: TaskListQuery = {}
): Promise<TaskListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(query.limit ?? 10)));

  // Access scope first — every other condition narrows within it.
  const scope: Record<string, unknown> =
    actor.role === 'admin' ? {} : { assignedTo: actor.id };

  if (query.assignedTo && actor.role === 'admin') {
    scope.assignedTo = query.assignedTo;
  }

  const filter: Record<string, unknown> = { ...scope };

  if (query.search?.trim()) {
    // Escape the input: a stray ( or * would otherwise be a regex, not a search.
    const safe = escapeRegExp(query.search.trim());
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  // Counts are taken before the status filter is applied, so the tabs keep
  // showing every total rather than only the selected one.
  const filterWithoutStatus = { ...filter };
  if (query.status) filter.status = query.status;

  const sortBy = query.sortBy ?? 'createdAt';
  const direction = query.order === 'asc' ? 1 : -1;
  // _id breaks ties so paging is stable when sort values repeat.
  const sort: Record<string, 1 | -1> = { [sortBy]: direction, _id: -1 };

  const [items, total, grouped] = await Promise.all([
    TaskModel.find(filter)
      .populate('assignedTo')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    TaskModel.countDocuments(filter),
    TaskModel.aggregate<{ _id: TaskStatus; count: number }>([
      { $match: filterWithoutStatus },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec(),
  ]);

  const counts: TaskStatusCounts = { all: 0, todo: 0, 'in-progress': 0, done: 0 };
  for (const g of grouped) {
    counts[g._id] = g.count;
    counts.all += g.count;
  }

  return {
    items: items.map((t) => t.toDomain()),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    counts,
  };
}

export async function createTask(actor: Actor, input: CreateTaskInput): Promise<Task> {
  // Reject an assignee that does not exist, rather than storing a dangling ref.
  const assignee = await UserModel.findById(input.assignedTo);
  if (!assignee) {
    throw new AppError(400, 'Assigned user does not exist');
  }

  const created = await TaskModel.create({
    title: input.title,
    description: input.description,
    assignedTo: assignee._id,
    createdBy: actor.id,
    status: 'todo',
  });

  await created.populate('assignedTo');
  const task = created.toDomain();

  // Assigning to yourself would notify yourself, which reads as a bug.
  if (assignee._id.toString() !== actor.id) {
    emitTaskAssigned(assignee._id.toString(), task);
  }

  return task;
}

/**
 * Only the assigned user may change status.
 *
 * Order matters: 404 before 403, so a caller cannot use the ownership check to
 * discover which task ids exist.
 */
export async function updateTaskStatus(
  actor: Actor,
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  const task = await TaskModel.findById(taskId);
  if (!task) throw new AppError(404, 'Task not found');

  // assignedTo is an ObjectId here (not populated), but both shapes stringify
  // to the same id, so go through _id when it is present.
  const assigned = task.assignedTo as Types.ObjectId | UserDocument;
  const assignedToId = String(
    '_id' in assigned ? (assigned as UserDocument)._id : assigned
  );

  // The assignee owns their task's status; an admin may override it as part of
  // managing all tasks. Any other user is refused.
  if (assignedToId !== actor.id && actor.role !== 'admin') {
    throw new AppError(403, 'Only the assigned user can update this task');
  }

  task.status = status;
  await task.save();
  await task.populate('assignedTo');

  const updated = task.toDomain();
  emitTaskUpdated(updated, actor.id);
  return updated;
}

/** Admin-only reassignment. Notifies the new assignee. */
export async function assignTask(
  actor: Actor,
  taskId: string,
  assignedTo: string
): Promise<Task> {
  const task = await TaskModel.findById(taskId);
  if (!task) throw new AppError(404, 'Task not found');

  const assignee = await UserModel.findById(assignedTo);
  if (!assignee) throw new AppError(400, 'Assigned user does not exist');

  task.assignedTo = assignee._id;
  await task.save();
  await task.populate('assignedTo');

  const updated = task.toDomain();
  if (assignee._id.toString() !== actor.id) {
    emitTaskAssigned(assignee._id.toString(), updated);
  }

  return updated;
}

/** Admin-only: edit title and/or description. */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const task = await TaskModel.findById(taskId);
  if (!task) throw new AppError(404, 'Task not found');

  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;

  await task.save();
  await task.populate('assignedTo');
  return task.toDomain();
}

/** Admin-only: permanently remove a task. */
export async function deleteTask(taskId: string): Promise<void> {
  const deleted = await TaskModel.findByIdAndDelete(taskId);
  if (!deleted) throw new AppError(404, 'Task not found');
  emitTaskDeleted(taskId);
}
