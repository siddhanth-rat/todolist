import { promises as fs } from "fs";
import mysql from "mysql2/promise";
import path from "path";

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

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string | null;
  email: string | null;
};

type TaskRow = {
  id: string;
  user_id: string;
  task_text: string;
  task_date: string | null;
  task_time: string | null;
  priority: "none" | "P1" | "P2" | "P3" | "P4";
  status: "Pending" | "Completed";
  created_at: number;
};

const dbPath = path.join(process.cwd(), "data", "db.json");
const useMysql = Boolean(process.env.DATABASE_URL || process.env.MYSQL_HOST);
let pool: mysql.Pool | null = null;
let schemaReady = false;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPool() {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 5,
      ssl: process.env.MYSQL_SSL === "false" ? undefined : { rejectUnauthorized: false },
    });
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 5,
    ssl: process.env.MYSQL_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });
  return pool;
}

async function ensureMysqlSchema() {
  if (schemaReady) return;
  const db = getPool();

  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(80) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) DEFAULT '',
    email VARCHAR(200) DEFAULT ''
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(80) PRIMARY KEY,
    user_id VARCHAR(80) NOT NULL,
    task_text VARCHAR(255) NOT NULL,
    task_date VARCHAR(20) DEFAULT '',
    task_time VARCHAR(20) DEFAULT '',
    priority VARCHAR(10) DEFAULT 'none',
    status VARCHAR(20) DEFAULT 'Pending',
    created_at BIGINT NOT NULL,
    INDEX tasks_user_id_idx (user_id),
    CONSTRAINT tasks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  schemaReady = true;
}

async function ensureJsonDb() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ users: [], tasks: [] }, null, 2));
  }
}

async function readJsonDb(): Promise<Database> {
  await ensureJsonDb();
  const raw = await fs.readFile(dbPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<Database>;
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
  };
}

async function writeJsonDb(db: Database) {
  await ensureJsonDb();
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

async function readMysqlDb(): Promise<Database> {
  await ensureMysqlSchema();
  const db = getPool();
  const [users] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM users");
  const [tasks] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM tasks ORDER BY id DESC");

  return {
    users: (users as UserRow[]).map((user) => ({
      id: user.id,
      username: user.username,
      passwordHash: user.password_hash,
      displayName: user.display_name || user.username,
      email: user.email || "",
    })),
    tasks: (tasks as TaskRow[]).map((task) => ({
      id: task.id,
      userId: task.user_id,
      taskText: task.task_text,
      taskDate: task.task_date || "",
      taskTime: task.task_time || "",
      priority: task.priority || "none",
      status: task.status || "Pending",
      createdAt: Number(task.created_at),
    })),
  };
}

async function writeMysqlDb(nextDb: Database) {
  await ensureMysqlSchema();
  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const user of nextDb.users) {
      await connection.query(
        `INSERT INTO users (id, username, password_hash, display_name, email)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          password_hash = VALUES(password_hash),
          display_name = VALUES(display_name),
          email = VALUES(email)`,
        [user.id, user.username, user.passwordHash, user.displayName, user.email],
      );
    }

    for (const task of nextDb.tasks) {
      await connection.query(
        `INSERT INTO tasks (id, user_id, task_text, task_date, task_time, priority, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          task_text = VALUES(task_text),
          task_date = VALUES(task_date),
          task_time = VALUES(task_time),
          priority = VALUES(priority),
          status = VALUES(status),
          created_at = VALUES(created_at)`,
        [task.id, task.userId, task.taskText, task.taskDate, task.taskTime, task.priority, task.status, task.createdAt],
      );
    }

    const userIds = nextDb.users.map((user) => user.id);
    const taskIds = nextDb.tasks.map((task) => task.id);

    if (userIds.length > 0) {
      await connection.query("DELETE FROM users WHERE id NOT IN (?)", [userIds]);
    } else {
      await connection.query("DELETE FROM users");
    }

    if (taskIds.length > 0) {
      await connection.query("DELETE FROM tasks WHERE id NOT IN (?)", [taskIds]);
    } else {
      await connection.query("DELETE FROM tasks");
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function readDb(): Promise<Database> {
  return useMysql ? readMysqlDb() : readJsonDb();
}

export async function writeDb(db: Database) {
  return useMysql ? writeMysqlDb(db) : writeJsonDb(db);
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
