import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTransactionalEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase().trim()));

    if (!existingUser) {
      return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
    }

    // Generate 6-digit OTP code (valid for 15 minutes)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db
      .update(user)
      .set({
        resetOtpCode: otpCode,
        resetOtpExpires: expiresAt,
      })
      .where(eq(user.id, existingUser.id));

    console.log(`\n======================================================`);
    console.log(`🔑 [EdClarity Security] Generated Reset OTP for ${email}: [ ${otpCode} ]`);
    console.log(`======================================================\n`);

    await sendTransactionalEmail({
      to: email.toLowerCase().trim(),
      fromName: "EdClarity Security",
      subject: `${otpCode} is your EdClarity Password Reset Verification Code`,
      html: `<div style="padding: 20px; background: #0F0926; color: white; border-radius: 12px; font-family: sans-serif;">
            <h2>EdClarity Security Code</h2>
            <p>Your 6-digit password reset verification code is:</p>
            <h1 style="color: #a855f7; letter-spacing: 4px;">${otpCode}</h1>
            <p>This code will expire in 15 minutes.</p>
          </div>`,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code generated",
      securityQuestion: existingUser.securityQuestion || "What is your secret verification code?",
      devOtpCode: otpCode,
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
