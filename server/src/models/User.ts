import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role, ROLES, User } from '../types';

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** bcrypt hash; `select: false`, so it is absent unless explicitly selected. */
  password: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
  toDomain(): User;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false, minlength: 6 },
    role: { type: String, enum: ROLES, default: 'user', required: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password);
};

/**
 * Explicit serialiser to the domain shape. Named `toDomain` rather than
 * overriding `toJSON`, because Mongoose declares `toJSON` on Document with a
 * fixed return type that a narrower signature cannot legally override.
 */
userSchema.methods.toDomain = function (): User {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
  };
};

// Safety net: strip the hash if a document is ever serialised directly.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    Reflect.deleteProperty(ret, 'password');
    return ret;
  },
});

export const UserModel = model<UserDocument>('User', userSchema);
