import { NextResponse } from 'next/server';
import { dodoClient } from '@/lib/dodo';
import { db } from '@/db';
import { lmsPurchases, userSubscriptions, user, lmsCourses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookId = req.headers.get('webhook-id') || '';
    const webhookSignature = req.headers.get('webhook-signature') || '';
    const webhookTimestamp = req.headers.get('webhook-timestamp') || '';
    const secretKey = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

    // Verify signature using Dodo SDK webhooks.unwrap
    const event = dodoClient.webhooks.unwrap(rawBody, {
      headers: {
        'webhook-id': webhookId,
        'webhook-signature': webhookSignature,
        'webhook-timestamp': webhookTimestamp,
      },
      key: secretKey,
    });

    console.log(`[DODO WEBHOOK] Received event: ${event.type}`);

    if (event.type === 'payment.succeeded') {
      const paymentData = event.data as any;
      const metadata = paymentData.metadata || {};
      const userId = metadata.userId;
      const courseId = metadata.courseId;

      if (userId && courseId) {
        const [purchase] = await db.insert(lmsPurchases).values({
          userId,
          courseId,
          dodoPaymentId: paymentData.payment_id || webhookId,
          amountPaid: paymentData.total_amount || 0,
        }).onConflictDoNothing().returning();

        // Calculate and record Teacher Revenue Split (85% Teacher / 15% Platform)
        const course = await db.query.lmsCourses.findFirst({
          where: eq(lmsCourses.id, courseId),
        });

        if (course?.userId) {
          const grossAmount = paymentData.total_amount || course.price || 0;
          const platformFee = Math.round(grossAmount * 0.15);
          const netAmount = grossAmount - platformFee;

          const { teacherEarnings } = await import('@/db/schema');
          await db.insert(teacherEarnings).values({
            teacherId: course.userId,
            courseId: course.id,
            purchaseId: purchase?.id || null,
            grossAmount,
            platformFee,
            netAmount,
            status: 'cleared',
          }).onConflictDoNothing();
        }
      }

      if (userId && metadata.type === 'pro_subscription') {
        await db.update(user).set({ isPro: true }).where(eq(user.id, userId));
      }
    }

    if (event.type === 'subscription.active' || event.type === 'subscription.renewed') {
      const subData = event.data as any;
      const userId = subData.metadata?.userId;
      if (userId) {
        await db.update(user).set({ isPro: true }).where(eq(user.id, userId));
        await db.insert(userSubscriptions).values({
          userId,
          dodoSubscriptionId: subData.subscription_id,
          dodoCustomerId: subData.customer?.customer_id || '',
          status: 'active',
          planId: subData.plan_id || 'pro_monthly',
          currentPeriodEnd: new Date(subData.next_billing_date || Date.now() + 30 * 86400 * 1000),
        }).onConflictDoNothing();
      }
    }

    if (event.type === 'subscription.cancelled' || event.type === 'subscription.expired') {
      const subData = event.data as any;
      const userId = subData.metadata?.userId;
      if (userId) {
        await db.update(user).set({ isPro: false }).where(eq(user.id, userId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[DODO WEBHOOK ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Webhook failed' }, { status: 400 });
  }
}
