import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, transcript } = body;

    if (!meetingId || !transcript) {
      return NextResponse.json({ error: "Missing meetingId or transcript" }, { status: 400 });
    }

    const [existingMeeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Single Execution Guard: Skip if already processing or completed
    if (existingMeeting.status === "processing" || existingMeeting.status === "completed") {
      return NextResponse.json({ message: "Meeting processing already initiated or completed." });
    }

    // Save transcript to database and change status to processing
    await db.update(meetings).set({
      transcript: JSON.stringify(transcript),
      status: "processing",
      endAt: new Date()
    }).where(eq(meetings.id, meetingId));

    // Trigger Inngest background job once
    await inngest.send({
      name: "meeting/finished",
      data: { meetingId }
    });

    return NextResponse.json({ message: "Meeting finished successfully" });
  } catch (error) {
    console.error("Finish meeting error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
