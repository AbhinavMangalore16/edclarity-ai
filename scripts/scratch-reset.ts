import "dotenv/config";
import { db } from "../src/db";
import {
  user,
  session,
  account,
  verification,
  notifyPeople,
  agents,
  meetings,
  liveClassEnrollments,
  documents,
  documentChunks,
  memoryItems,
  messages,
  clarityCourses,
  clarityModules,
  clarityLessons,
  clarityUserProgress,
  clarityLessonCompletions,
  dailyQuizzes,
  flashcards,
  spacedRepetitionReviews,
  categories,
  lmsCourses,
  lmsChapters,
  lmsAttachments,
  muxData,
  lmsProgress,
  lmsPurchases,
  userSubscriptions,
  lmsCertificates,
  teacherEarnings,
  aiTraces,
  adminNotifications,
  outboxEvents,
  indexState,
  aiReviewQueue,
  ragFeedback
} from "../src/db/schema";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { video } from "../src/lib/mux";
import fs from "fs";
import path from "path";

async function resetAllData() {
  console.log("🧹 [Scratch Reset] Clearing Neon PostgreSQL database tables...");

  try {
    // Delete dependent tables first to avoid FK constraints
    await db.delete(ragFeedback);
    await db.delete(aiReviewQueue);
    await db.delete(indexState);
    await db.delete(outboxEvents);
    await db.delete(aiTraces);
    await db.delete(adminNotifications);

    await db.delete(teacherEarnings);
    await db.delete(liveClassEnrollments);
    await db.delete(lmsCertificates);
    await db.delete(lmsPurchases);
    await db.delete(lmsProgress);
    await db.delete(muxData);
    await db.delete(lmsAttachments);
    await db.delete(lmsChapters);
    await db.delete(lmsCourses);
    await db.delete(categories);
    await db.delete(userSubscriptions);

    await db.delete(spacedRepetitionReviews);
    await db.delete(flashcards);
    await db.delete(dailyQuizzes);
    await db.delete(clarityLessonCompletions);
    await db.delete(clarityUserProgress);
    await db.delete(clarityLessons);
    await db.delete(clarityModules);
    await db.delete(clarityCourses);

    await db.delete(messages);
    await db.delete(memoryItems);
    await db.delete(documentChunks);
    await db.delete(documents);
    await db.delete(meetings);
    await db.delete(agents);
    await db.delete(notifyPeople);

    await db.delete(verification);
    await db.delete(account);
    await db.delete(session);
    await db.delete(user);

    console.log("✅ [Database Reset] All PostgreSQL tables cleared successfully!");
  } catch (err: any) {
    console.error("❌ Database reset error:", err.message);
  }

  // Clear Mux Video Assets
  console.log("🧹 [Scratch Reset] Clearing Mux Video Assets...");
  try {
    const assetsList = await video.assets.list({ limit: 100 });
    if (assetsList.data && assetsList.data.length > 0) {
      for (const asset of assetsList.data) {
        try {
          await video.assets.delete(asset.id);
          console.log(`  - Deleted Mux asset: ${asset.id}`);
        } catch (e: any) {
          console.warn(`  - Could not delete Mux asset ${asset.id}:`, e.message);
        }
      }
      console.log(`✅ [Mux Reset] Cleared ${assetsList.data.length} video assets.`);
    } else {
      console.log("ℹ️ Mux video storage is already empty.");
    }
  } catch (muxErr: any) {
    console.warn("⚠️ Mux reset notice:", muxErr.message);
  }

  // Clear OpenSearch Indices
  const openSearchUrl = process.env.OPENSEARCH_URL || "http://localhost:9200";
  console.log(`🧹 [Scratch Reset] Clearing OpenSearch indices at ${openSearchUrl}...`);
  try {
    const osRes = await fetch(`${openSearchUrl}/*`, { method: "DELETE" });
    if (osRes.ok) {
      console.log("✅ [OpenSearch Reset] All OpenSearch indices purged successfully!");
    } else {
      console.log("ℹ️ OpenSearch response:", await osRes.text());
    }
  } catch (osErr: any) {
    console.warn("⚠️ OpenSearch notice (might be offline):", osErr.message);
  }

  // Clear S3 / Cloudflare R2 Bucket
  const bucketName = process.env.S3_BUCKET_NAME;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_BUCKET_API;

  if (bucketName && accessKey && secretKey && endpoint) {
    console.log(`🧹 [Scratch Reset] Clearing Cloudflare R2 / S3 Bucket: ${bucketName}...`);
    try {
      const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${endpoint}`,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });

      const listCmd = new ListObjectsV2Command({ Bucket: bucketName });
      const listRes = await s3Client.send(listCmd);

      if (listRes.Contents && listRes.Contents.length > 0) {
        const objectsToDelete = listRes.Contents.map((obj) => ({ Key: obj.Key }));
        const deleteCmd = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: objectsToDelete },
        });
        await s3Client.send(deleteCmd);
        console.log(`✅ [Bucket Reset] Deleted ${objectsToDelete.length} objects from bucket.`);
      } else {
        console.log("ℹ️ Bucket is already empty.");
      }
    } catch (s3Err: any) {
      console.error("❌ Bucket reset error:", s3Err.message);
    }
  }

  // Clear local LibraRAG SQLite & uploaded PDFs if present
  const localPathsToClean = [
    path.resolve(__dirname, "../../agentic-course/LibraRAG/librarag.db"),
    path.resolve(__dirname, "../src/modules/LibraRAG/librarag.db"),
  ];
  for (const dbFile of localPathsToClean) {
    if (fs.existsSync(dbFile)) {
      try {
        fs.unlinkSync(dbFile);
        console.log(`✅ [LibraRAG SQLite] Removed ${dbFile}`);
      } catch (e: any) {
        console.warn(`⚠️ Could not remove ${dbFile}:`, e.message);
      }
    }
  }

  const uploadDirsToClean = [
    path.resolve(__dirname, "../../agentic-course/LibraRAG/uploads"),
    path.resolve(__dirname, "../../agentic-course/LibraRAG/data"),
    path.resolve(__dirname, "../src/modules/LibraRAG/uploads"),
    path.resolve(__dirname, "../src/modules/LibraRAG/data"),
  ];
  for (const dir of uploadDirsToClean) {
    if (fs.existsSync(dir)) {
      try {
        for (const entry of fs.readdirSync(dir)) {
          if (entry === ".gitkeep") continue;
          fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
        }
        console.log(`✅ [LibraRAG Uploads] Emptied ${dir}`);
      } catch (e: any) {
        console.warn(`⚠️ Could not empty ${dir}:`, e.message);
      }
    }
  }

  console.log("\n🚀 All databases, Mux videos, OpenSearch indices, and Cloudflare storage buckets have been reset to 0 state!");
  process.exit(0);
}

resetAllData();
