import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { readDb, writeDb } from "@/lib/store";

function serializeTask(task: { id: string; taskText: string; taskDate: string; taskTime: string; priority: string; status: string; createdAt: number }) {
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text, date, time, priority, completed } = await request.json();
  const db = await readDb();
  const index = db.tasks.findIndex((task) => task.id === id && task.userId === user.id);
  if (index < 0) return NextResponse.json({ message: "Task not found" }, { status: 404 });

  if (text !== undefined) db.tasks[index].taskText = String(text).trim();
  if (date !== undefined) db.tasks[index].taskDate = String(date);
  if (time !== undefined) db.tasks[index].taskTime = String(time);
  if (priority !== undefined && ["P1", "P2", "P3", "P4", "none"].includes(String(priority))) db.tasks[index].priority = priority;
  if (completed !== undefined) db.tasks[index].status = completed ? "Completed" : "Pending";

  await writeDb(db);
  return NextResponse.json(serializeTask(db.tasks[index]));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await readDb();
  db.tasks = db.tasks.filter((task) => !(task.id === id && task.userId === user.id));
  await writeDb(db);
  return NextResponse.json({ message: "Task deleted" });
}
