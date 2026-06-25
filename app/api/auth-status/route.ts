import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { publicUser } from "@/lib/store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({ loggedIn: true, user: publicUser(user) });
}
