import { cookies } from "next/headers";
import { readDb } from "./store";

export const SESSION_COOKIE = "todo-next-user";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const db = await readDb();
  return db.users.find((user) => user.id === userId) ?? null;
}
