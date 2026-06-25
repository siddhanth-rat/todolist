import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { readDb, writeDb } from "@/lib/store";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { priority } = await request.json();
  if (!["P1", "P2", "P3", "P4", "none"].includes(String(priority))) {
    return NextResponse.json({ message: "Invalid priority" }, { status: 400 });
  }

  const db = await readDb();
  const task = db.tasks.find((item) => item.id === id && item.userId === user.id);
  if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

  task.priority = priority;
  await writeDb(db);
  return NextResponse.json({ message: "Priority updated" });
}
