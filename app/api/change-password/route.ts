import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { readDb, writeDb } from "@/lib/store";

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  const current = String(currentPassword ?? "");
  const next = String(newPassword ?? "");

  if (!(await bcrypt.compare(current, user.passwordHash))) return NextResponse.json({ message: "Current password is wrong" }, { status: 401 });
  if (next.length < 6) return NextResponse.json({ message: "New password needs at least 6 characters" }, { status: 400 });

  const db = await readDb();
  const index = db.users.findIndex((item) => item.id === user.id);
  if (index < 0) return NextResponse.json({ message: "User not found" }, { status: 404 });

  db.users[index] = { ...db.users[index], passwordHash: await bcrypt.hash(next, 10) };
  await writeDb(db);
  return NextResponse.json({ message: "Password changed" });
}
