import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, account, verification } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode, name, password } = await req.json();

    if (!email || !otpCode) {
      return NextResponse.json({ error: "Email and OTP verification code are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailsDisabled = process.env.DISABLE_VERIFICATION_EMAILS === "true";

    if (emailsDisabled) {
      console.log(`⚡ [EdClarity Feature Flag] Bypassing OTP check for ${cleanEmail}`);
      // Auto-create user account directly
      const userId = crypto.randomUUID();
      const userName = name || cleanEmail.split("@")[0];

      await db.insert(user).values({
        id: userId,
        name: userName,
        email: cleanEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      if (password) {
        const hashedPassword = await hashPassword(password);
        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId: userId,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
      }

      return NextResponse.json({
        success: true,
        message: "Account created (Verification Bypassed via Feature Flag)",
        user: { id: userId, name: userName, email: cleanEmail },
      });
    }

    // Check verification table
    const [rec] = await db.select().from(verification).where(eq(verification.identifier, cleanEmail));
    if (!rec) {
      return NextResponse.json({ error: "Verification code expired or not found. Please request a new code." }, { status: 400 });
    }

    const isExpired = new Date(rec.expiresAt) < new Date();
    if (isExpired) {
      await db.delete(verification).where(eq(verification.id, rec.id));
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    const payload = JSON.parse(rec.value || "{}");
    const attempts = (payload.attempts || 0) + 1;

    if (payload.otp !== otpCode.trim()) {
      if (attempts >= 5) {
        await db.delete(verification).where(eq(verification.id, rec.id));
        return NextResponse.json(
          { error: "Too many invalid verification attempts. For security reasons, please request a new verification code." },
          { status: 429 }
        );
      }

      // Update failed attempt count in payload
      const updatedPayload = JSON.stringify({ ...payload, attempts });
      await db
        .update(verification)
        .set({ value: updatedPayload })
        .where(eq(verification.id, rec.id));

      return NextResponse.json(
        { error: `Invalid 6-digit OTP code (${5 - attempts} attempts remaining). Please check your email and try again.` },
        { status: 400 }
      );
    }

    // OTP Verified! Create user account in database
    const userId = crypto.randomUUID();
    const userName = name || payload.name || cleanEmail.split("@")[0];
    const userPassword = password || payload.password;

    await db.insert(user).values({
      id: userId,
      name: userName,
      email: cleanEmail,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (userPassword) {
      const hashedPassword = await hashPassword(userPassword);
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId: userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Delete verification record after successful sign up
    await db.delete(verification).where(eq(verification.id, rec.id));

    return NextResponse.json({
      success: true,
      message: "Email verified & account authorized successfully!",
      user: { id: userId, name: userName, email: cleanEmail },
    });
  } catch (error: any) {
    console.error("Verify Sign-Up OTP Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
