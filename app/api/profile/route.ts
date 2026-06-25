import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { publicUser, readDb, writeDb } from "@/lib/store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json(publicUser(user));
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { displayName, email } = await request.json();
  const db = await readDb();
  const index = db.users.findIndex((item) => item.id === user.id);
  if (index < 0) return NextResponse.json({ message: "User not found" }, { status: 404 });

  db.users[index] = {
    ...db.users[index],
    displayName: String(displayName ?? "").trim() || db.users[index].username,
    email: String(email ?? "").trim(),
  };
  await writeDb(db);
  return NextResponse.json({ user: publicUser(db.users[index]) });
}
