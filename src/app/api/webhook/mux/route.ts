import { NextResponse } from 'next/server';
import { db } from '@/db';
import { muxData } from '@/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.type;

    console.log(`[MUX WEBHOOK] Received event: ${eventType}`);

    if (eventType === 'video.asset.ready') {
      const asset = body.data;
      const chapterId = asset.passthrough;
      const assetId = asset.id;
      const playbackId = asset.playback_ids?.[0]?.id;

      if (chapterId && assetId && playbackId) {
        await db.insert(muxData).values({
          chapterId,
          assetId,
          playbackId,
        }).onConflictDoUpdate({
          target: muxData.chapterId,
          set: {
            assetId,
            playbackId,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[MUX WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Mux webhook failed' }, { status: 400 });
  }
}
