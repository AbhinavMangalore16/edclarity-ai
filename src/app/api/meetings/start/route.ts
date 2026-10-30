import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    // Set the meeting as active and mark the precise start time for accurate duration calculation
    await db.update(meetings).set({
      status: "active",
      startAt: new Date(),
    }).where(eq(meetings.id, meetingId));

    return NextResponse.json({ message: "Meeting started successfully" });
  } catch (error) {
    console.error("Start meeting error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
