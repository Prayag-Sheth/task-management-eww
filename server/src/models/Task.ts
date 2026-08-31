import { Schema, model, Document, Types } from 'mongoose';
import { TaskStatus, TASK_STATUSES, Task } from '../types';
import { UserDocument } from './User';

export interface TaskDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  /** ObjectId normally; a UserDocument once populated. */
  assignedTo: Types.ObjectId | UserDocument;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toDomain(): Task;
}

const taskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'todo',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Primary access pattern: a user's tasks, newest first.
taskSchema.index({ assignedTo: 1, createdAt: -1 });

taskSchema.methods.toDomain = function (): Task {
  const assigned = this.assignedTo as Types.ObjectId | UserDocument;
  const isPopulated = assigned != null && 'email' in assigned;

  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    status: this.status,
    assignedTo: isPopulated
      ? (assigned as UserDocument).toDomain()
      : assigned.toString(),
    createdBy: this.createdBy.toString(),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const TaskModel = model<TaskDocument>('Task', taskSchema);
