import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { readDb, writeDb } from "@/lib/store";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  if (!["Pending", "Completed"].includes(String(status))) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const db = await readDb();
  const task = db.tasks.find((item) => item.id === id && item.userId === user.id);
  if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

  task.status = status;
  await writeDb(db);
  return NextResponse.json({ message: "Status updated" });
}
