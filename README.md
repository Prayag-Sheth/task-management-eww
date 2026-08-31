# Task Management

A minimal task management application with JWT authentication, role-based access
control, and real-time assignment notifications.

**Stack:** Node.js · Express · TypeScript · MongoDB (Mongoose) · Socket.io ·
React · Vite · Ant Design

---

## Features

**Admin**
- Create tasks and assign them to any user
- View all tasks
- Reassign an existing task

**User**
- View only the tasks assigned to them
- Update the status of their own tasks
- Receive a real-time notification the moment a task is assigned to them

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`
  (a standalone instance is fine — no replica set required)

MongoDB Atlas also works; just point `MONGODB_URI` at your cluster.

---

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env     # adjust if your Mongo runs elsewhere
npm run seed             # creates the demo users and a few tasks
npm run dev              # http://localhost:5000
```

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

Open http://localhost:5173 and sign in.

---

## Demo accounts

All accounts use the password **`password123`**.

| Email               | Role  |
|---------------------|-------|
| `admin@example.com` | admin |
| `john@example.com`  | user  |
| `jane@example.com`  | user  |

### Seeing the real-time notification

1. Sign in as `admin@example.com` in one browser window.
2. Sign in as `john@example.com` in a second window (use a private window so the
   two sessions don't share storage).
3. As the admin, create a task and assign it to John.
4. John's window shows a notification immediately, and the task appears in his
   list without a refresh.

---

## Environment variables

**`server/.env`**

| Variable         | Description                          | Example |
|------------------|--------------------------------------|---------|
| `PORT`           | API port                             | `5000` |
| `NODE_ENV`       | Environment                          | `development` |
| `MONGODB_URI`    | MongoDB connection string            | `mongodb://127.0.0.1:27017/task_management` |
| `JWT_SECRET`     | Secret used to sign tokens           | a long random string |
| `JWT_EXPIRES_IN` | Token lifetime                       | `1d` |
| `CLIENT_URL`     | Allowed CORS origin(s), comma-separated | `http://localhost:5173` |

**`client/.env`**

| Variable          | Description        | Example |
|-------------------|--------------------|---------|
| `VITE_API_URL`    | API base URL       | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Socket.io endpoint | `http://localhost:5000` |

---

## API

All responses use a consistent envelope:

```jsonc
// success
{ "success": true, "data": { } }

// failure
{ "success": false, "message": "…", "errors": { "field": ["…"] } }
```

| Method  | Endpoint                  | Access            | Description |
|---------|---------------------------|-------------------|-------------|
| `POST`  | `/api/auth/login`         | Public            | Returns a JWT and the user |
| `GET`   | `/api/auth/me`            | Authenticated     | The current user |
| `GET`   | `/api/users`              | **Admin**         | Assignee list for the task form |
| `POST`  | `/api/tasks`              | **Admin**         | Create and assign a task |
| `GET`   | `/api/tasks`              | Authenticated     | Admin: all tasks · User: only their own |
| `PATCH` | `/api/tasks/:id/status`   | **Assignee only** | Update a task's status |
| `PATCH` | `/api/tasks/:id/assign`   | **Admin**         | Reassign a task |

**Status codes:** `400` validation or bad id · `401` missing/invalid/expired
token · `403` insufficient permission · `404` not found · `409` duplicate.

### Socket.io events

The client connects with its JWT (`auth: { token }`); unauthenticated sockets are
rejected. Each user joins a private room, so a notification reaches every tab
they have open.

| Event           | Direction       | Payload                          |
|-----------------|-----------------|----------------------------------|
| `task:assigned` | Server → client | `{ task, message }` — to the assignee only |
| `task:updated`  | Server → client | `{ taskId, status, updatedBy }`  |

---

## Project structure

```
server/src
├── config/       env + database connection
├── models/       Mongoose schemas (User, Task)
├── middleware/   auth, requireRole, validate, asyncHandler, errorHandler
├── services/     business logic and access rules
├── controllers/  thin request/response handlers
├── routes/       route definitions
├── sockets/      Socket.io auth, rooms and emitters
└── utils/        AppError, JWT helpers

client/src
├── api/          axios instance + endpoint wrappers
├── context/      AuthContext, SocketContext
├── hooks/        useAuth, useSocket, useTasks
├── components/   TaskList, TaskForm, StatusSelect, ProtectedRoute
└── pages/        Login, Tasks
```

### Where access control lives

Three separate layers, each with one job:

1. **`middleware/auth.ts`** — is the token valid, and does the user still exist?
2. **`middleware/requireRole.ts`** — does the role permit this route?
3. **`services/task.service.ts`** — ownership. Read scoping (`admin` sees all,
   a user sees only their own) and the assignee check both live here, because
   they depend on the data rather than the route.

---

## Design decisions

**Mongoose rather than Prisma.** Prisma's MongoDB connector requires a replica
set, so the app would refuse to start against a standalone local `mongod`.
Mongoose connects to any instance, which keeps setup to one command.

**Two folders rather than a monorepo.** There are only two deployables and no
third consumer of shared code. Workspace tooling (Turborepo, Nx, pnpm workspaces)
would add build steps and module-resolution complexity without changing what
ships.

**Shared types are duplicated, not packaged.** `server/src/types.ts` and
`client/src/types.ts` are copies of the same contract. In a longer-lived project
this would be a shared workspace package; here a copy avoids putting a build step
between a reviewer and a running app. The two files must be edited together.

**`toDomain()` rather than overriding `toJSON()`.** Mongoose declares `toJSON` on
`Document` with a fixed return type, so narrowing it to the domain shape is not a
legal TypeScript override. An explicit serialiser keeps the model fully typed;
a `toJSON` transform still strips the password hash as a safety net.

**React Context rather than Redux.** There are two pieces of global state (the
session and the socket). A store would be more machinery than the problem needs.

**One Socket.io room per user** rather than a socket registry. Rooms handle
multiple tabs per user for free and need no bookkeeping on disconnect.

**Ant Design for the UI.** The brief prioritises working code and correct access
control over UI polish, so a component library buys a clean interface without
hand-written CSS.

---

## Assumptions

- **Seeded users only.** The brief allows this, so there is no registration
  endpoint.
- **Admins cannot change a task's status.** The brief says status updates are for
  the "assigned user only", so an admin who is not the assignee receives a `403`.
  Enforcing this literally seemed better than assuming an override.
- **`GET /api/users` was added.** It is not in the brief, but an admin cannot
  populate an assignee dropdown without it. It is admin-only.
- **Tasks are assigned at creation.** `assignedTo` is required, and
  `PATCH /tasks/:id/assign` covers reassignment afterwards.
- **Offline assignees are not queued.** If the assignee is not connected, the
  socket emit is a no-op and they see the task on their next load. Persisted
  notifications were out of scope.
- **Admins can be assignees.** They appear in the dropdown like any other user.
- **`localStorage` holds the JWT.** Simple and adequate here; a production build
  would prefer an httpOnly refresh-token cookie.
