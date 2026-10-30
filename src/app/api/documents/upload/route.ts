import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Filename and contentType are required" }, { status: 400 });
    }

    // Check Free Tier Limit (Max 3 Uploads)
    const [docCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, session.user.id));

    if (docCount.count >= 3) {
      return NextResponse.json({ error: "LIMIT_UPLOADS" }, { status: 403 });
    }

    // Generate unique key and S3 Presigned URL
    const fileId = nanoid();
    const key = `uploads/${session.user.id}/${fileId}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Save document record to DB
    const [document] = await db
      .insert(documents)
      .values({
        id: fileId,
        name: filename,
        key: key,
        url: presignedUrl.split("?")[0], // Store base URL
        userId: session.user.id,
      })
      .returning();

    // Emit CDC outbox event + trigger async PDF indexing
    const { emitOutboxEvent } = await import("@/lib/ai/cdc");
    const { inngest } = await import("@/inngest/client");
    await emitOutboxEvent({
      aggregateType: "document",
      aggregateId: document.id,
      op: "upsert",
      payload: {
        title: document.name,
        url: document.url,
        userId: session.user.id,
        metadata: { key: document.key, contentType },
      },
    }).catch(() => null);

    void inngest
      .send({
        name: "document/uploaded",
        data: { documentId: document.id, userId: session.user.id, url: document.url, title: document.name },
      })
      .catch(() => null);

    return NextResponse.json({ presignedUrl, document });
  } catch (error) {
    console.error("Upload Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
