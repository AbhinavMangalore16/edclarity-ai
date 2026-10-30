import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify session authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view documents." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Fetch document record belonging strictly to current authenticated user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    if (!doc) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    // 3. Fetch file stream directly from Cloudflare R2 server-side (prevents exposing bucket name/topology)
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: doc.key,
    });

    const s3Response = await s3.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: "Document content unavailable" }, { status: 404 });
    }

    // Convert AWS SDK stream to Web ReadableStream for Next.js response
    const webStream = s3Response.Body.transformToWebStream();

    // 4. Stream PDF directly to client under local domain endpoint (no presigned URL/redirect leak)
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": s3Response.ContentType || "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Doc View Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
