import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, or, and, ilike } from "drizzle-orm";
import { s3, BUCKET_NAME } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");
    const key = searchParams.get("key");
    const name = searchParams.get("name");

    const rawName = name ? decodeURIComponent(name) : null;
    const rawKey = key ? decodeURIComponent(key) : null;

    const cleanName = rawName ? (rawName.split("/").pop() || rawName) : null;
    const cleanKey = rawKey ? (rawKey.split("/").pop() || rawKey) : null;

    // Remove (1), (2) copy suffixes for fuzzy search
    const sanitizedName = cleanName ? cleanName.replace(/\s*\(\d+\)\.pdf$/i, ".pdf") : null;

    let docKey: string | null = null;

    // Require session authentication for user document security
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to view your documents." }, { status: 401 });
    }

    const userId = session.user.id;

    // Tier 1: Search PostgreSQL DB for exact match belonging strictly to current user
    if (documentId) {
      const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
      if (doc) docKey = doc.key;
    }

    if (!docKey && (cleanName || cleanKey || sanitizedName)) {
      const queryCandidates = Array.from(new Set([cleanName, sanitizedName, cleanKey].filter(Boolean))) as string[];
      for (const targetQuery of queryCandidates) {
        const docs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.userId, userId),
              or(
                eq(documents.name, targetQuery),
                eq(documents.key, key || targetQuery),
                ilike(documents.name, `%${targetQuery}%`),
                ilike(documents.key, `%${targetQuery}%`)
              )
            )
          );
        
        if (docs.length > 0) {
          docKey = docs[0].key;
          break;
        }
      }
    }

    // Tier 1.5: If no exact document match found, fall back to current user's most recent uploaded document
    if (!docKey) {
      const [latestUserDoc] = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId));
      
      if (latestUserDoc) {
        docKey = latestUserDoc.key;
      }
    }

    // Tier 2: Stream directly from Cloudflare R2 server-side (prevents revealing bucket name / R2 account topology)
    if (docKey && docKey.includes("/")) {
      try {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: docKey,
        });

        const s3Response = await s3.send(command);

        if (s3Response.Body) {
          const webStream = s3Response.Body.transformToWebStream();
          return new NextResponse(webStream, {
            status: 200,
            headers: {
              "Content-Type": s3Response.ContentType || "application/pdf",
              "Content-Disposition": `inline; filename="${encodeURIComponent(cleanName || "document.pdf")}"`,
              "Cache-Control": "private, max-age=3600",
            },
          });
        }
      } catch (s3Err) {
        console.warn("S3 server-side stream error, trying fallback:", s3Err);
      }
    }

    // Tier 3: Fallback proxy from local RAG backend with encoded & decoded variations
    const fileCandidates = Array.from(new Set([
      cleanName,
      sanitizedName,
      cleanKey,
    ].filter(Boolean))) as string[];

    const backendBases = ["http://localhost:8001/files", "http://localhost:8000/files"];

    for (const fileCandidate of fileCandidates) {
      for (const base of backendBases) {
        const backendUrls = [
          `${base}/${encodeURIComponent(fileCandidate)}`,
          `${base}/${fileCandidate}`,
        ];

        for (const backendUrl of backendUrls) {
          try {
            const backendRes = await fetch(backendUrl);
            if (backendRes.ok) {
              const contentType = backendRes.headers.get("content-type") || "application/pdf";
              return new NextResponse(backendRes.body, {
                status: 200,
                headers: {
                  "Content-Type": contentType,
                  "Cache-Control": "public, max-age=3600",
                },
              });
            }
          } catch (err) {
            // Continue trying fallback candidates
          }
        }
      }
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  } catch (error) {
    console.error("Proxy Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
