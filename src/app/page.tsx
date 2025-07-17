"use client"
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
export default function HomePage() {
  const handleSignOut = () => authClient.signOut();
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 
                     animate-fade-slide"
    >
      <h1 className="text-4xl font-bold mb-4">Welcome to EdClarity.ai</h1>
      <p className="text-lg text-muted-foreground text-center max-w-xl">
        Create your free account or log in to get started. This app is built with Next.js 14, Tailwind CSS, and modular architecture.
      </p>
      <Button onClick={handleSignOut} className="mt-4">Sign Out</Button>
    </main>
  );
}
