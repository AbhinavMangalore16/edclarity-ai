import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifyPeople } from "@/db/schema";
import { eq } from "drizzle-orm"; 

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(notifyPeople)
    .where(eq(notifyPeople.email, email))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { message: "Email is already on our list." },
      { status: 409 } 
    );
  }


  const [person] = await db.insert(notifyPeople).values({ email }).returning();

  return NextResponse.json(person);
}
