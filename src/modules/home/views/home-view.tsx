"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import CircularProgress from '@mui/material/CircularProgress';

export default function HomePageView() {
    const fullText = "EdClarity.ai is launching soon!";
    const [displayedText, setDisplayedText] = useState("");
    const [email, setEmail] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const handleSignOut = async () => {
        await authClient.signOut();
    };

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(fullText.slice(0, i + 1));
            i++;
            if (i === fullText.length) clearInterval(interval);
        }, 70);
        return () => clearInterval(interval);
    }, []);

    const handleNotify = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.trim() === "") return;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.");
            setSubmitted(false);
            setEmail("");
            setShowInput(false);
            setMessage("Please enter a valid email address.");
            return;
        }
        try {
            setMessage("");
            const res = await fetch("/api/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (res.status === 409) {
                setSubmitted(true);
                setMessage(data.message || data.error || "🎉 You are already in our notifications list! We'll keep you posted.");
                setEmail("");
            }
            else if (res.ok) {
                setSubmitted(true);
                setMessage("🎉 You're on the list! We'll keep you posted.");
                setEmail("");
            }

            else {
                const err = await res.json();
                setMessage(err.error || "Something went wrong.");
            }
        } catch (error) {
            setMessage("Network error. Please try again.");
        }
    };
    if (isPending) return <div><CircularProgress /></div>;

    return (
        <main className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-[#c9d6ff] to-[#e2e2e2] text-center">

            {/* Top Navigation */}
            <div className="absolute top-4 left-6 right-6 flex justify-between items-center">
                <span className="text-sm text-green-800 font-medium">
                    Logged in as {session?.user.name}
                </span>
                <Button
                    className="px-4 py-2 text-sm font-medium shadow-md hover:scale-105 transition"
                    onClick={() => {
                        authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })
                    }}
                >
                    Sign Out
                </Button>
            </div>

            {/* Rest of the content */}
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900 mt-20">
                {displayedText}
                <span className="border-r-2 border-gray-900 animate-pulse ml-1"></span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8">
                We're building something powerful to revolutionize learning clarity. Stay tuned — we’ll be live before you know it.
            </p>

            {!showInput && !submitted && (
                <Button
                    className="text-lg px-6 py-3 rounded-xl shadow-md hover:scale-105 transition"
                    onClick={() => setShowInput(true)}
                >
                    Notify Me
                </Button>
            )}

            {showInput && !submitted && (
                <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-md">
                    <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button onClick={handleNotify} className="w-full sm:w-auto">
                        Submit
                    </Button>
                </div>
            )}

            {submitted && (
                <p className="mt-4 text-green-600 font-medium">
                    🎉 You're on the list! We'll keep you posted.
                </p>
            )}

            <p className="text-xs text-muted-foreground mt-8 opacity-70">
                Made with 💡 using Next.js, Tailwind, and clarity-driven design.
            </p>
        </main>

    );
}
