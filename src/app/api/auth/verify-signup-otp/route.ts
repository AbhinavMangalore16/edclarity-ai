import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, account, verification } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode, name, password } = await req.json();

    if (!email || !otpCode) {
      return NextResponse.json({ error: "Email and OTP verification code are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailsDisabled = process.env.DISABLE_VERIFICATION_EMAILS === "true";

    let resolvedName = (name || "").trim() || cleanEmail.split("@")[0];
    let resolvedPassword = password || "";

    if (!emailsDisabled) {
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

      resolvedName = (name || payload.name || cleanEmail.split("@")[0]).trim();
      resolvedPassword = password || payload.password || "";

      // Delete verification record after successful OTP match
      await db.delete(verification).where(eq(verification.id, rec.id));
    }

    // Use Better Auth's native signUpEmail so the session cookie is created and signed properly
    let setCookieHeaders: string[] = [];
    let createdUserId = "";

    try {
      const signUpRes = await auth.api.signUpEmail({
        body: {
          name: resolvedName,
          email: cleanEmail,
          password: resolvedPassword,
        },
        asResponse: true,
      });

      if (signUpRes.ok) {
        const setCookie = signUpRes.headers.getSetCookie?.() || [];
        if (setCookie.length > 0) {
          setCookieHeaders = setCookie;
        } else {
          const singleCookie = signUpRes.headers.get("set-cookie");
          if (singleCookie) setCookieHeaders = [singleCookie];
        }
        const data = await signUpRes.json().catch(() => ({}));
        createdUserId = data?.user?.id || "";
      }
    } catch (authErr: any) {
      console.warn("[verify-signup-otp] auth.api.signUpEmail fallback:", authErr?.message || authErr);
    }

    // Ensure user exists and emailVerified is set to true in DB
    const [existingDbUser] = await db.select().from(user).where(eq(user.email, cleanEmail));
    if (existingDbUser) {
      createdUserId = existingDbUser.id;
      await db
        .update(user)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, existingDbUser.id));
    } else {
      const userId = crypto.randomUUID();
      createdUserId = userId;
      await db.insert(user).values({
        id: userId,
        name: resolvedName,
        email: cleanEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (resolvedPassword) {
        const hashedPassword = await hashPassword(resolvedPassword);
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
    }

    const response = NextResponse.json({
      success: true,
      message: "Email verified & account authorized successfully!",
      user: { id: createdUserId, name: resolvedName, email: cleanEmail },
    });

    for (const cookie of setCookieHeaders) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error: any) {
    console.error("Verify Sign-Up OTP Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
