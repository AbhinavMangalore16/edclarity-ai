import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, account } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode, securityAnswer, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase().trim()));

    if (!existingUser) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }

    let isValid = false;

    // Method 1: Check 6-digit OTP code
    if (otpCode && existingUser.resetOtpCode) {
      const isExpired = existingUser.resetOtpExpires && new Date(existingUser.resetOtpExpires) < new Date();
      if (!isExpired && existingUser.resetOtpCode.trim() === otpCode.trim()) {
        isValid = true;
      }
    }

    // Method 2: Check Security Answer
    if (!isValid && securityAnswer && existingUser.securityAnswer) {
      if (securityAnswer.toLowerCase().trim() === existingUser.securityAnswer.toLowerCase().trim()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification OTP code / security answer" },
        { status: 400 }
      );
    }

    // Update password in account table for credential provider using Better-Auth crypto
    const hashedPassword = await hashPassword(newPassword);

    const [existingAccount] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, existingUser.id), eq(account.providerId, "credential")));

    if (existingAccount) {
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.id, existingAccount.id));
    } else {
      // Insert credential account row if not existing
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: existingUser.id,
        providerId: "credential",
        userId: existingUser.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Clear reset OTP after successful reset
    await db
      .update(user)
      .set({
        resetOtpCode: null,
        resetOtpExpires: null,
      })
      .where(eq(user.id, existingUser.id));

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset! You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
