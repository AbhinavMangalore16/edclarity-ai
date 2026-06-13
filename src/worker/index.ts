console.log("[Worker] Disabled stub worker. Webhook now owns meeting join flow.");

process.on("SIGINT", () => {
  console.log("[Worker] Shutting down...");
  process.exit(0);
});
