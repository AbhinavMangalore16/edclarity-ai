import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendTransactionalEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existingUser] = await db.select().from(user).where(eq(user.email, cleanEmail));
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // Rate-limiting: Check if a code was sent to this email less than 60 seconds ago
    const [existingVerification] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, cleanEmail));

    if (existingVerification && existingVerification.createdAt) {
      const secondsSinceLastRequest = (Date.now() - new Date(existingVerification.createdAt).getTime()) / 1000;
      if (secondsSinceLastRequest < 60) {
        const waitTime = Math.ceil(60 - secondsSinceLastRequest);
        return NextResponse.json(
          { error: `Please wait ${waitTime} seconds before requesting a new verification code.` },
          { status: 429 }
        );
      }
    }

    // Check if verification emails are disabled via feature flag
    const emailsDisabled = process.env.DISABLE_VERIFICATION_EMAILS === "true";

    // Generate OTP verification code (fixed 123456 if emails disabled, or random 6-digit)
    const otpCode = emailsDisabled ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Store in verification table
    const verificationId = crypto.randomUUID();
    const payload = JSON.stringify({ otp: otpCode, name: name.trim(), password, attempts: 0 });

    // Clean old verification records for this email
    await db.delete(verification).where(eq(verification.identifier, cleanEmail));

    await db.insert(verification).values({
      id: verificationId,
      identifier: cleanEmail,
      value: payload,
      expiresAt: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Print OTP clearly to terminal console for instant dev testing
    console.log(`\n======================================================`);
    console.log(`🔑 [EdClarity Security] Generated Sign-Up OTP for ${cleanEmail}: [ ${otpCode} ]`);
    console.log(`======================================================\n`);

    let emailSent = false;
    let resendStatusMessage = "";

    if (emailsDisabled) {
      console.log(`⚡ [EdClarity Feature Flag] Verification Emails Disabled. Auto-generated OTP: 123456`);
      return NextResponse.json({
        success: true,
        disabled: true,
        message: "Verification email sending disabled (Feature Flag Active). Use code 123456.",
        emailSent: false,
        devOtp: "123456",
      });
    }

    const delivery = await sendTransactionalEmail({
      to: cleanEmail,
      fromName: "EdClarity Authorization",
      subject: `${otpCode} is your EdClarity Email Verification Code`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #0F0926; color: #ffffff; border-radius: 20px; border: 1px solid rgba(168,85,247,0.3);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #c084fc; margin: 0; font-size: 22px;">Authorize Your EdClarity Account</h2>
              <p style="color: #a78bfa; font-size: 13px; margin-top: 6px;">Please verify your email address to complete registration</p>
            </div>
            
            <div style="background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.4); padding: 20px; border-radius: 16px; text-align: center; margin: 20px 0;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #d8b4fe; margin-bottom: 8px; font-weight: bold;">Your 6-Digit Verification Code</div>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f472b6; font-family: monospace;">${otpCode}</div>
            </div>

            <p style="color: #cbd5e1; font-size: 12px; line-height: 1.5; text-align: center;">
              Enter this code on the sign-up page to verify your email address. This code expires in 15 minutes.
            </p>
          </div>`,
    });

    emailSent = delivery.sent;
    resendStatusMessage = delivery.error || "";

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Verification code sent to ${cleanEmail}`
        : `OTP Code generated. (Resend Notice: ${resendStatusMessage || "Check terminal logs"})`,
      emailSent,
      devOtp: otpCode, // Provided for instant testing
    });
  } catch (error: any) {
    console.error("Send Sign-Up OTP Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
