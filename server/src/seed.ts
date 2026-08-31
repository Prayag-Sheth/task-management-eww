import { connectDatabase, disconnectDatabase } from './config/db';
import { UserModel } from './models/User';
import { TaskModel } from './models/Task';

const PASSWORD = 'password123';

const SEED_USERS = [
  { name: 'Admin User', email: 'admin@example.com', role: 'admin' as const },
  { name: 'John Doe', email: 'john@example.com', role: 'user' as const },
  { name: 'Jane Smith', email: 'jane@example.com', role: 'user' as const },
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
  const [, john, jane] = users;

  await TaskModel.create([
    {
      title: 'Set up project repository',
      description: 'Initialise the repo and push the scaffold.',
      status: 'done',
      assignedTo: john._id,
      createdBy: admin._id,
    },
    {
      title: 'Design the database schema',
      description: 'Model users and tasks with the required fields.',
      status: 'in-progress',
      assignedTo: john._id,
      createdBy: admin._id,
    },
    {
      title: 'Write API documentation',
      description: 'Document every endpoint and its access rules.',
      status: 'todo',
      assignedTo: jane._id,
      createdBy: admin._id,
    },
  ]);

  console.log('\nSeed complete. Accounts (password: %s):\n', PASSWORD);
  for (const u of users) {
    console.log(`  ${u.role.padEnd(5)}  ${u.email}`);
  }
  console.log('');

  await disconnectDatabase();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDatabase();
  process.exit(1);
});
