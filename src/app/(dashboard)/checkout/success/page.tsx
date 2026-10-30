"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trpc = useTRPC();

  const paymentId = searchParams.get("payment_id") || searchParams.get("paymentId") || undefined;
  const status = searchParams.get("status") || "succeeded";
  const courseId = searchParams.get("course_id") || undefined;
  const email = searchParams.get("email") || undefined;

  const [redirectPath, setRedirectPath] = useState<string>("/courses");

  const claimMutation = useMutation(
    trpc.lms.claimPayment.mutationOptions({
      onSuccess: (data) => {
        toast.success("Payment verified! Access granted.");
        const dest = data.redirectUrl || (courseId ? `/learn/${courseId}` : "/courses");
        setRedirectPath(dest);
        setTimeout(() => {
          router.push(dest);
        }, 2000);
      },
      onError: (err) => {
        console.error("Claim Payment error:", err);
        const dest = courseId ? `/learn/${courseId}` : "/courses";
        setRedirectPath(dest);
      },
    })
  );

  useEffect(() => {
    claimMutation.mutate({
      paymentId,
      courseId,
      status,
    });
  }, []);

  return (
    <Card className="w-full max-w-md border border-purple-500/30 bg-card shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 pt-8">
        <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-3">
          {claimMutation.isPending ? (
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
          ) : (
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          )}
        </div>
        <CardTitle className="text-2xl font-sora font-bold text-foreground">
          {claimMutation.isPending ? "Verifying Payment..." : "Payment Successful! 🎉"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          {claimMutation.isPending
            ? "Confirming your transaction details with Dodo Payments..."
            : "Your course access has been permanently unlocked."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-center p-6">
        {paymentId && (
          <div className="bg-muted/40 border border-border/80 rounded-xl p-3 text-left space-y-1 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Payment Reference:</span>
              <span className="font-mono font-bold text-foreground text-[11px] truncate max-w-[180px]">
                {paymentId}
              </span>
            </div>
            {email && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Customer Email:</span>
                <span className="font-medium text-foreground text-[11px] truncate max-w-[180px]">
                  {email}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Status:</span>
              <span className="font-bold text-emerald-500 capitalize">{status}</span>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Link href={redirectPath}>
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-sora font-semibold text-sm py-2.5 rounded-xl shadow-md gap-2">
              <span>Continue to Course</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-purple-600" />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
