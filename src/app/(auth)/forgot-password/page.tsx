"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, KeyRound, ShieldCheck, Mail, Lock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request reset code");
      }

      setSecurityQuestion(data.securityQuestion || "Enter 6-digit OTP code sent to email:");
      if (data.devOtpCode) {
        setDevOtp(data.devOtpCode);
      }
      toast.success("Verification code & Security prompt generated!");
      setStep("reset");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode && !securityAnswer) {
      setError("Please enter either the 6-digit OTP code or Security Answer");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otpCode,
          securityAnswer,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast.success("Password reset successfully!");
      setStep("success");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0926] via-[#1E164F] to-[#2A1B6F] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Aura */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-3xl -z-10" />

      {/* Back to Login Button */}
      <Button
        asChild
        variant="ghost"
        className="absolute top-4 left-4 z-50 flex items-center gap-2 text-purple-200 hover:text-white bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl"
      >
        <Link href="/login">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </Button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/10 backdrop-blur-2xl border border-white/20 text-white rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8">
          <CardHeader className="text-center p-0 mb-6 space-y-2">
            <div className="mx-auto h-14 w-14 bg-purple-500/20 border border-purple-500/40 rounded-2xl flex items-center justify-center text-purple-300 shadow-lg">
              <KeyRound className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-white tracking-tight">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-xs text-purple-200/80">
              Reset your password using OTP verification code or Security Questions
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {step === "email" && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-purple-200">Account Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                    <Input
                      type="email"
                      required
                      placeholder="student@edclarity.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-purple-300/40 rounded-xl text-xs h-11"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl h-11 text-xs shadow-lg shadow-purple-600/30"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Generate Reset Verification Code
                </Button>
              </form>
            )}

            {/* STEP 2: Enter OTP / Security Answer + New Password */}
            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {devOtp && (
                  <div className="p-2.5 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-[11px] text-yellow-200">
                    🔑 <strong>Dev Verification Code:</strong> <span className="font-mono font-bold">{devOtp}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-purple-200">6-Digit OTP Verification Code</Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP (e.g. 849204)"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="bg-white/5 border-white/15 text-white font-mono tracking-widest text-center text-sm rounded-xl h-11"
                  />
                </div>

                <div className="relative my-2 flex items-center justify-center">
                  <div className="w-full border-t border-white/10" />
                  <span className="bg-[#1E164F] px-2 text-[10px] uppercase text-purple-300 font-bold shrink-0">
                    OR Security Question
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-purple-200">
                    {securityQuestion || "Security Question"}
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter secret security answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="bg-white/5 border-white/15 text-white rounded-xl text-xs h-11"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold text-purple-200">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                    <Input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/15 text-white rounded-xl text-xs h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-purple-200">Confirm New Password</Label>
                  <Input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/5 border-white/15 text-white rounded-xl text-xs h-11"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-11 text-xs shadow-lg shadow-emerald-600/30"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Reset Password Now"}
                </Button>
              </form>
            )}

            {/* STEP 3: Success Screen */}
            {step === "success" && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto h-14 w-14 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Password Changed!</h4>
                <p className="text-xs text-purple-200/80">
                  Your password has been successfully updated. You can now log into your EdClarity account.
                </p>

                <Button asChild className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl h-11 text-xs">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
