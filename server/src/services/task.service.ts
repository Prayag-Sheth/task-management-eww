import { Types } from 'mongoose';
import { TaskModel } from '../models/Task';
import { UserModel, UserDocument } from '../models/User';
import { AppError } from '../utils/AppError';
import { emitTaskAssigned, emitTaskUpdated, emitTaskDeleted } from '../sockets';
import {
  CreateTaskInput,
  UpdateTaskInput,
  Role,
  Task,
  TaskStatus,
} from '../types';

interface Actor {
  id: string;
  role: Role;
}

/**
 * Admin sees every task; a user sees only their own. This scoping is the single
 * source of truth for read access — controllers never filter.
 */
export async function listTasks(actor: Actor): Promise<Task[]> {
  const filter = actor.role === 'admin' ? {} : { assignedTo: actor.id };

  const tasks = await TaskModel.find(filter)
    .populate('assignedTo')
    .sort({ createdAt: -1 });

  return tasks.map((t) => t.toDomain());
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
