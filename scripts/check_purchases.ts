import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

async function main() {
  const { db } = await import("../src/db");
  const { lmsCourses } = await import("../src/db/schema");

  const courses = await db.select().from(lmsCourses);
  console.log("=== COURSES DETAIL ===");
  console.log(courses.map(c => ({ id: c.id, title: c.title, price: c.price, isPublished: c.isPublished })));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
