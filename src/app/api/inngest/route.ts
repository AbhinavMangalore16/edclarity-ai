if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  delete process.env.INNGEST_DEV;
}

import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processMeetingSummary } from "../../../inngest/functions/meeting-processor";
import { cleanupSoftDeletedAgents } from "../../../inngest/functions/cleanup-agents";
import { dailyQuizCron } from "../../../inngest/functions/daily-quiz-cron";
import { opensearchMaintenance } from "../../../inngest/functions/opensearch-maintenance";
import { spacedRepetitionCron } from "../../../inngest/functions/spaced-repetition-cron";
import { processPdf } from "../../../inngest/functions/process-pdf";
import { cdcDispatcher, cdcReconcileNightly, ltrWeeklyRetrain } from "../../../inngest/functions/cdc-dispatcher";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processMeetingSummary,
    cleanupSoftDeletedAgents,
    dailyQuizCron,
    opensearchMaintenance,
    spacedRepetitionCron,
    processPdf,
    cdcDispatcher,
    cdcReconcileNightly,
    ltrWeeklyRetrain,
  ],
});
