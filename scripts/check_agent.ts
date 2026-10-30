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
  const { agents, meetings } = await import("../src/db/schema");
  const { isNull } = await import("drizzle-orm");

  const allAgents = await db.select().from(agents).where(isNull(agents.deletedAt));
  console.log("All active agents count:", allAgents.length);
  console.log("Agents:", allAgents.map(a => ({ id: a.id, name: a.name, userId: a.userId })));
  const allMeetings = await db.select().from(meetings);
  console.log("Total meetings in DB:", allMeetings.length);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
