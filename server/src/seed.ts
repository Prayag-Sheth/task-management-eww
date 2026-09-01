import { connectDatabase, disconnectDatabase } from './config/db';
import { UserModel } from './models/User';
import { TaskModel } from './models/Task';
import { TaskStatus } from './types';

const PASSWORD = 'password123';

const SEED_USERS = [
  { name: 'Admin User', email: 'admin@example.com', role: 'admin' as const },
  { name: 'Priya Sharma', email: 'admin2@example.com', role: 'admin' as const },
  { name: 'John Doe', email: 'john@example.com', role: 'user' as const },
  { name: 'Jane Smith', email: 'jane@example.com', role: 'user' as const },
  { name: 'Arjun Patel', email: 'arjun@example.com', role: 'user' as const },
  { name: 'Sara Khan', email: 'sara@example.com', role: 'user' as const },
  { name: 'Michael Chen', email: 'michael@example.com', role: 'user' as const },
  { name: 'Aisha Begum', email: 'aisha@example.com', role: 'user' as const },
  { name: 'Tom Wilson', email: 'tom@example.com', role: 'user' as const },
  { name: 'Nina Rodriguez', email: 'nina@example.com', role: 'user' as const },
  { name: 'Rahul Verma', email: 'rahul@example.com', role: 'user' as const },
  { name: 'Emily Carter', email: 'emily@example.com', role: 'user' as const },
  { name: 'Omar Farouk', email: 'omar@example.com', role: 'user' as const },
  { name: 'Lena Fischer', email: 'lena@example.com', role: 'user' as const },
  { name: 'David Park', email: 'david@example.com', role: 'user' as const },
];

/** assignee is an index into SEED_USERS. */
const SEED_TASKS: Array<{
  title: string;
  description?: string;
  status: TaskStatus;
  assignee: number;
}> = [
  {
    title: 'Set up project repository',
    description: 'Initialise the repo, add the base structure and push the scaffold.',
    status: 'done',
    assignee: 2,
  },
  {
    title: 'Design the database schema',
    description: 'Model users and tasks with the required fields and indexes.',
    status: 'done',
    assignee: 2,
  },
  {
    title: 'Implement JWT authentication',
    description: 'Login endpoint, token signing and the auth middleware.',
    status: 'done',
    assignee: 3,
  },
  {
    title: 'Build the role-based access layer',
    description: 'Route-level role gates plus ownership checks in the service layer.',
    status: 'in-progress',
    assignee: 3,
  },
  {
    title: 'Write API documentation',
    description: 'Document every endpoint, its access rules and error codes.',
    status: 'in-progress',
    assignee: 4,
  },
  {
    title: 'Add Socket.io notifications',
    description: 'Emit task:assigned to the assignee and keep rooms per user.',
    status: 'in-progress',
    assignee: 5,
  },
  {
    title: 'Create the task list UI',
    description: 'Table with status filtering and role-aware controls.',
    status: 'done',
    assignee: 6,
  },
  {
    title: 'Review pull request #42',
    description: 'Check the error-handling refactor before it lands on main.',
    status: 'todo',
    assignee: 7,
  },
  {
    title: 'Fix the login redirect loop',
    description: 'Session restore bounces to /login on refresh when the token is stale.',
    status: 'todo',
    assignee: 4,
  },
  {
    title: 'Add request validation',
    description: 'Zod schemas on every write endpoint, surfaced as field errors.',
    status: 'done',
    assignee: 8,
  },
  {
    title: 'Set up CI pipeline',
    description: 'Typecheck, lint and build on every push.',
    status: 'todo',
    assignee: 10,
  },
  {
    title: 'Optimise the task list query',
    description: 'Populate the assignee in one round trip and index the hot path.',
    status: 'todo',
    assignee: 11,
  },
  {
    title: 'Write integration tests',
    description: 'Cover the RBAC matrix: every role against every endpoint.',
    status: 'in-progress',
    assignee: 6,
  },
  {
    title: 'Prepare the deployment guide',
    description: 'Environment variables, build steps and a rollback procedure.',
    status: 'todo',
    assignee: 1,
  },
  {
    title: 'Audit dependency vulnerabilities',
    description: 'Run an audit, upgrade anything with a known advisory.',
    status: 'todo',
    assignee: 12,
  },
];

async function seed(): Promise<void> {
  await connectDatabase();

  await TaskModel.deleteMany({});
  await UserModel.deleteMany({});

  // create() (not insertMany) so the pre-save hook hashes each password.
  const users = await UserModel.create(
    SEED_USERS.map((u) => ({ ...u, password: PASSWORD }))
  );

  const admin = users.find((u) => u.role === 'admin')!;

  await TaskModel.create(
    SEED_TASKS.map((t) => ({
      title: t.title,
      description: t.description,
      status: t.status,
      assignedTo: users[t.assignee]._id,
      createdBy: admin._id,
    }))
  );

  const admins = users.filter((u) => u.role === 'admin');
  const members = users.filter((u) => u.role === 'user');

  console.log(
    `\nSeed complete: ${users.length} users, ${SEED_TASKS.length} tasks.` +
      `\nAll accounts use the password: ${PASSWORD}\n`
  );
  console.log('  Admins');
  for (const u of admins) console.log(`    ${u.email}`);
  console.log('\n  Users');
  for (const u of members) console.log(`    ${u.email}`);
  console.log('');

  await disconnectDatabase();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDatabase();
  process.exit(1);
});
