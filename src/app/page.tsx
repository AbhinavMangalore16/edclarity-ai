"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import clsx from "clsx";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  const { data: session } = authClient.useSession();

  const handleSubmit = () => {
    authClient.signUp.email({ email, password, name }, {
      onError: (c) => alert("Sign-up failed."),
      onSuccess: () => {
        alert("Check your inbox to verify!");
        setEmail(""); setPassword(""); setName("");
      },
    });
  };

  const handleSignIn = () => {
    authClient.signIn.email({ email, password }, {
      onError: () => alert("Sign-in failed."),
      onSuccess: () => {
        alert("Signed in successfully");
        setEmail(""); setPassword("");
      },
    });
  };

  const handleSignOut = () => authClient.signOut();

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] font-sans">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold mb-4">Welcome back, {session.user.name}</h2>
          <Button onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] font-sans px-4">
      <div className={clsx("relative w-[768px] min-h-[480px] bg-white rounded-[30px] shadow-xl overflow-hidden transition-all duration-700", {
        "active": isSigningUp
      })}>
        {/* Sign In Form */}
        <div className={clsx("absolute top-0 h-full w-1/2 p-10 transition-all duration-700 ease-in-out", {
          "left-0 opacity-100 z-20": !isSigningUp,
          "-left-full opacity-0 z-10": isSigningUp,
        })}>
          <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4"
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6"
          />
          <Button className="w-full" onClick={handleSignIn}>Sign In</Button>
        </div>

        {/* Sign Up Form */}
        <div className={clsx("absolute top-0 h-full w-1/2 p-10 transition-all duration-700 ease-in-out", {
          "left-full w-1/2 opacity-0 z-10": !isSigningUp,
          "left-0 w-1/2 opacity-100 z-30 translate-x-full": isSigningUp,
        })}>
          <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4"
          />
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4"
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6"
          />
          <Button className="w-full" onClick={handleSubmit}>Sign Up</Button>
        </div>

        {/* Toggle Panel */}
        <div className={clsx(
          "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-all duration-700 ease-in-out z-30",
          isSigningUp
            ? "-translate-x-full rounded-[0_150px_100px_0]"
            : "translate-x-0 rounded-[150px_0_0_100px]"
        )}>
          <div className="bg-gradient-to-r from-[#5c6bc0] to-[#2da0a8] text-white flex flex-col justify-center items-center h-full px-10 text-center transition-all duration-700">
            <h2 className="text-3xl font-bold mb-2">
              {isSigningUp ? "Welcome Back!" : "New here?"}
            </h2>
            <p className="text-sm mb-4">
              {isSigningUp ? "Already have an account? Sign in now." : "Create your EdClarity.ai account in seconds."}
            </p>
            <Button
              variant="outline"
              className="text-white border-white bg-white/20 backdrop-blur-sm hover:bg-white/30 transition"
              onClick={() => setIsSigningUp(!isSigningUp)}
            >
              {isSigningUp ? "Sign In" : "Sign Up"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
