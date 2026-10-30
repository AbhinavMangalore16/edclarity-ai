import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendTransactionalEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, normalizedEmail));

    if (existingUser) {
      return NextResponse.json(
        { error: "An account already exists with this email address. Please sign in instead." },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP code (valid for 15 minutes)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const identifier = `signup-otp:${normalizedEmail}`;

    // Clean up any old OTP for this email
    await db.delete(verification).where(eq(verification.identifier, identifier));

    // Store new OTP verification code
    await db.insert(verification).values({
      id: nanoid(),
      identifier,
      value: otpCode,
      expiresAt,
    });

    await sendTransactionalEmail({
      to: normalizedEmail,
      fromName: "EdClarity Verification",
      subject: `${otpCode} is your EdClarity Sign Up Verification Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="font-size: 22px; margin: 0; color: #38bdf8;">EdClarity.ai</h2>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Sign Up Email Verification</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">Hello ${name || "there"}, enter this code to verify your account:</p>
            <h1 style="font-size: 32px; letter-spacing: 8px; color: #38bdf8; margin: 12px 0; font-family: monospace;">${otpCode}</h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Code expires in 15 minutes.</p>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      devOtpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
    });
  } catch (error: any) {
    console.error("Send Signup OTP Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
