"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { HeadsetIcon, SendIcon } from "lucide-react";
import { useState } from "react";

export default function SupportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Formspree handles the actual submission, we just show a loading state briefly
    // The form will redirect to Formspree's thank you page unless AJAX is used.
    // For simplicity, we just let it submit natively.
    setIsSubmitting(true);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-4xl mx-auto min-h-[calc(100vh-4rem)]">
      <Card className="w-full shadow-lg border-purple-100 dark:border-purple-900/30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
            <HeadsetIcon className="w-6 h-6 text-purple-600" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Contact Support</CardTitle>
          <CardDescription className="text-base text-gray-500">
            Have a question or running into an issue? Send us a message and we&apos;ll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            action="https://formspree.io/f/xzdqkrgd" 
            method="POST"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="John Doe" 
                  required 
                  className="bg-white dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  required 
                  className="bg-white dark:bg-zinc-900"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject" 
                name="subject" 
                placeholder="How can we help you?" 
                required 
                className="bg-white dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                name="message" 
                placeholder="Please describe your issue or question in detail..." 
                rows={6}
                required
                className="resize-none bg-white dark:bg-zinc-900"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 h-auto text-lg flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : (
                <>
                  <SendIcon className="w-5 h-5" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
