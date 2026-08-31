import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { LoginInput, LoginResponse, User } from '../types';

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
