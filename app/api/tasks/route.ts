import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { newId, readDb, TaskRecord, writeDb } from "@/lib/store";

function serializeTask(task: TaskRecord) {
  return {
    id: task.id,
    text: task.taskText,
    date: task.taskDate,
    time: task.taskTime,
    priority: task.priority,
    completed: task.status === "Completed",
    createdAt: task.createdAt,
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  return NextResponse.json(db.tasks.filter((task) => task.userId === user.id).map(serializeTask));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { text, date, time, priority } = await request.json();
  const taskText = String(text ?? "").trim();
  if (!taskText) return NextResponse.json({ message: "Task text required" }, { status: 400 });

  const db = await readDb();
  const task: TaskRecord = {
    id: newId(),
    userId: user.id,
    taskText,
    taskDate: String(date ?? ""),
    taskTime: String(time ?? ""),
    priority: ["P1", "P2", "P3", "P4", "none"].includes(String(priority)) ? priority : "none",
    status: "Pending",
    createdAt: Date.now(),
  };
  db.tasks.unshift(task);
  await writeDb(db);
  return NextResponse.json(serializeTask(task), { status: 201 });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  db.tasks = db.tasks.filter((task) => task.userId !== user.id);
  await writeDb(db);
  return NextResponse.json({ message: "All tasks deleted" });
}
