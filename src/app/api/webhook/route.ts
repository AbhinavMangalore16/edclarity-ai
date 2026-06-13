import {
    CallSessionStartedEvent,
    CallSessionEndedEvent,
    CallTranscriptionReadyEvent,
    CallSessionParticipantLeftEvent,
    CallRecordingReadyEvent,
} from "@stream-io/node-sdk"
import {and, eq, inArray, not} from "drizzle-orm"
import { NextRequest, NextResponse} from "next/server"
import { db } from "@/db"
import { agents, meetings } from "@/db/schema"
import { streamVideo } from "@/lib/stream-video"

function verificationStream(body: string, signature: string){
    return streamVideo.verifyWebhook(body, signature);
}

export async function POST(request: NextRequest){
    const signature = request.headers.get("x-signature");
    const apiKey = request.headers.get("x-api-key");

    if (!signature || !apiKey) {
        return NextResponse.json({error: "Missing signature or API key"}, {status: 400});
    }
    const body = await request.text();
    if (!verificationStream(body, signature)) {
        return NextResponse.json({error: "Invalid signature"}, {status: 401});
    }
    let event: unknown;
    try {
        event = JSON.parse(body);
    } catch (error) {
        return NextResponse.json({error: "Invalid JSON payload"}, {status: 400});
    }
    const eventType = (event as Record<string, unknown>)?.type;
    if (eventType === "call.session_started") {
        const eve = event as CallSessionStartedEvent;
        const meetingId = eve.call.custom?.meetingId;
        if(!meetingId){
            return NextResponse.json({error: "Missing meetingId in call custom data"}, {status: 400});
        }
        const [existingMeeting] = await db.select().from(meetings)
        .where(and(eq(meetings.id, meetingId), not(
        inArray(meetings.status, [
          "completed",
          "cancelled",
          "processing",
          "active",
        ])
      )
        ));
        if(!existingMeeting){
            return NextResponse.json({error: "Meeting not found or already active/completed/cancelled"}, {status: 404});
        }
        await db.update(meetings).set({status: "active", startAt: new Date()}).where(eq(meetings.id, meetingId));
        const [existingAgent] = await db.select().from(agents).where(eq(agents.id, existingMeeting.agentId));
        if (!existingAgent) {
            return NextResponse.json({error: "Agent not found for this meeting"}, {status: 404});
        }
        const call = streamVideo.video.call("default", meetingId);
        const realTimeClient = await streamVideo.video.connectOpenAi({
            call,
            
            openAiApiKey: process.env.AICREDITS_KEY!,
            agentUserId: existingAgent.id
        })
        realTimeClient.updateSession({
            instructions: existingAgent.instructions,
        })
    } else if (eventType === "call.session_participant_left") {
        const eve = event as CallSessionParticipantLeftEvent;
        const meetingId = eve.call_cid.split(":")[1];

        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId in call_cid" }, { status: 400 });
        }
        const call = streamVideo.video.call("default", meetingId);
        await call.end();
    }

    return NextResponse.json({message: "Event received"}, {status: 200});
}