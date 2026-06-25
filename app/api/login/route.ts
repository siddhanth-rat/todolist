import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { publicUser, readDb } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const normalizedUsername = String(username ?? "").trim();
  const rawPassword = String(password ?? "");

  const db = await readDb();
  const user = db.users.find((item) => item.username.toLowerCase() === normalizedUsername.toLowerCase());
  if (!user || !(await bcrypt.compare(rawPassword, user.passwordHash))) {
    return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return NextResponse.json({ user: publicUser(user) });
}
