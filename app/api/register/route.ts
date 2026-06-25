import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { newId, publicUser, readDb, writeDb } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const normalizedUsername = String(username ?? "").trim();
  const rawPassword = String(password ?? "");

  if (normalizedUsername.length < 3) return NextResponse.json({ message: "Username needs at least 3 characters" }, { status: 400 });
  if (rawPassword.length < 6) return NextResponse.json({ message: "Password needs at least 6 characters" }, { status: 400 });

  const db = await readDb();
  const exists = db.users.some((user) => user.username.toLowerCase() === normalizedUsername.toLowerCase());
  if (exists) return NextResponse.json({ message: "Username already exists" }, { status: 409 });

  const user = {
    id: newId(),
    username: normalizedUsername,
    passwordHash: await bcrypt.hash(rawPassword, 10),
    displayName: normalizedUsername,
    email: "",
  };

  db.users.push(user);
  await writeDb(db);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
}
