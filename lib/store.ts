import type { Prisma, User, Task } from ".prisma/client";
import { prisma } from "./prisma";


export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  email: string;
};

export type TaskRecord = {
  id: string;
  userId: string;
  taskText: string;
  taskDate: string;
  taskTime: string;
  priority: "none" | "P1" | "P2" | "P3" | "P4";
  status: "Pending" | "Completed";
  createdAt: number;
};

type Database = {
  users: UserRecord[];
  tasks: TaskRecord[];
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function readDb(): Promise<Database> {
  const [users, tasks] = await Promise.all([
    prisma.user.findMany(),
    prisma.task.findMany({ orderBy: { id: "desc" } }),
  ]);

  return {
    users: users.map((u: User) => ({
      id: u.id,
      username: u.username,
      passwordHash: u.password_hash,
      displayName: u.display_name || "",
      email: u.email || "",
    })),
    tasks: tasks.map((t: Task) => ({
      id: t.id,
      userId: t.user_id,
      taskText: t.task_text,
      taskDate: t.task_date || "",
      taskTime: t.task_time || "",
      priority: (t.priority as TaskRecord["priority"]) || "none",
      status: (t.status as TaskRecord["status"]) || "Pending",
      createdAt: Number(t.created_at),
    })),
  };
}

export async function writeDb(nextDb: Database): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Upsert users
    for (const user of nextDb.users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          username: user.username,
          password_hash: user.passwordHash,
          display_name: user.displayName || "",
          email: user.email || "",
        },
        update: {
          username: user.username,
          password_hash: user.passwordHash,
          display_name: user.displayName || "",
          email: user.email || "",
        },
      });
    }

    // 2. Upsert tasks
    for (const task of nextDb.tasks) {
      await tx.task.upsert({
        where: { id: task.id },
        create: {
          id: task.id,
          user_id: task.userId,
          task_text: task.taskText,
          task_date: task.taskDate || "",
          task_time: task.taskTime || "",
          priority: task.priority || "none",
          status: task.status || "Pending",
          created_at: BigInt(task.createdAt),
        },
        update: {
          user_id: task.userId,
          task_text: task.taskText,
          task_date: task.taskDate || "",
          task_time: task.taskTime || "",
          priority: task.priority || "none",
          status: task.status || "Pending",
          created_at: BigInt(task.createdAt),
        },
      });
    }

    // 3. Delete records that are no longer present
    const userIds = nextDb.users.map((u) => u.id);
    const taskIds = nextDb.tasks.map((t) => t.id);

    if (taskIds.length > 0) {
      await tx.task.deleteMany({
        where: { id: { notIn: taskIds } },
      });
    } else {
      await tx.task.deleteMany({});
    }

    if (userIds.length > 0) {
      await tx.user.deleteMany({
        where: { id: { notIn: userIds } },
      });
    } else {
      await tx.user.deleteMany({});
    }
  });
}

export function newId() {
  return createId();
}

export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
  };
}
