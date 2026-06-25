import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { publicUser, readDb, writeDb } from "@/lib/store";

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { newUsername, password } = await request.json();
  const nextUsername = String(newUsername ?? "").trim();
  const rawPassword = String(password ?? "");

  if (nextUsername.length < 3) return NextResponse.json({ message: "Username needs at least 3 characters" }, { status: 400 });
  if (!(await bcrypt.compare(rawPassword, user.passwordHash))) return NextResponse.json({ message: "Current password is wrong" }, { status: 401 });

  const db = await readDb();
  const taken = db.users.some((item) => item.id !== user.id && item.username.toLowerCase() === nextUsername.toLowerCase());
  if (taken) return NextResponse.json({ message: "Username already taken" }, { status: 409 });

  const index = db.users.findIndex((item) => item.id === user.id);
  if (index < 0) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const displayWasUsername = db.users[index].displayName === db.users[index].username;
  db.users[index] = {
    ...db.users[index],
    username: nextUsername,
    displayName: displayWasUsername ? nextUsername : db.users[index].displayName,
  };
  await writeDb(db);
  return NextResponse.json({ user: publicUser(db.users[index]) });
}
