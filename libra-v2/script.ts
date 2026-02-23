import { prisma } from "@/lib/prisma";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateActivityCycle() {
  const iterations = 50; // number of activity cycles

  for (let i = 0; i < iterations; i++) {
    console.log(`\n--- Activity Cycle ${i + 1} ---`);

    const actionType = randomInt(1, 4);

    // 1️⃣ New user joins
    if (actionType === 1) {
      const name = `User${Date.now()}`;
      await prisma.user.create({
        data: {
          name,
          email: `${name}@example.com`,
          active: true,
          posts: {
            create: Array.from({ length: 3 }).map(() => ({
              title: "New user activity",
              content: "Simulated content...",
              published: true,
            })),
          },
        },
      });
      console.log("🟢 New user joined");
    }

    // 2️⃣ Existing active user posts
    if (actionType === 2) {
      const activeUsers = await prisma.user.findMany({
        where: { active: true },
      });

      if (activeUsers.length > 0) {
        const user =
          activeUsers[randomInt(0, activeUsers.length - 1)];

        await prisma.post.create({
          data: {
            title: "Returning activity",
            content: "More simulated content...",
            published: true,
            authorId: user.id,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        console.log(`🔵 Active user ${user.name} posted`);
      }
    }

    // 3️⃣ User becomes inactive (goes out)
    if (actionType === 3) {
      const activeUsers = await prisma.user.findMany({
        where: { active: true },
      });

      if (activeUsers.length > 0) {
        const user =
          activeUsers[randomInt(0, activeUsers.length - 1)];

        await prisma.user.update({
          where: { id: user.id },
          data: { active: false },
        });

        console.log(`🔴 User ${user.name} went inactive`);
      }
    }

    // 4️⃣ Inactive user returns
    if (actionType === 4) {
      const inactiveUsers = await prisma.user.findMany({
        where: { active: false },
      });

      if (inactiveUsers.length > 0) {
        const user =
          inactiveUsers[randomInt(0, inactiveUsers.length - 1)];

        await prisma.user.update({
          where: { id: user.id },
          data: {
            active: true,
            lastActiveAt: new Date(),
          },
        });

        console.log(`🟣 User ${user.name} returned`);
      }
    }

    await delay(randomInt(300, 1500));
  }

  console.log("\n🎉 Simulation complete.");
}

simulateActivityCycle()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });