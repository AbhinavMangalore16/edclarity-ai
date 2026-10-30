"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BellIcon,
  ShieldAlertIcon,
  CheckCircle2Icon,
  Loader2Icon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminNotificationsPage() {
  const trpc = useTRPC();

  const { data: notifications = [], isLoading, refetch } = useQuery(
    trpc.observability.getNotifications.queryOptions(undefined, { refetchInterval: 5000 })
  );

  const markReadMutation = useMutation(
    trpc.observability.markNotificationRead.mutationOptions({
      onSuccess: () => {
        toast.success("Notification marked as read");
        refetch();
      },
    })
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 px-4 py-2 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-sora font-bold text-foreground flex items-center gap-2 tracking-tight">
              <BellIcon className="w-5 h-5 text-amber-500" /> Admin Alert Notifications
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            System notifications triggered by linguistic safety guardrail flags, latency spikes, and LLM telemetry events.
          </p>
        </div>

        <Link href="/admin/observability">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border hover:bg-accent">
            View AI Traces
          </Button>
        </Link>
      </div>

      <div className="flex-1 pb-6 px-4 md:px-8 flex flex-col gap-y-4">
        {notifications.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center text-muted-foreground shadow-xs">
            <CheckCircle2Icon className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <h4 className="text-base font-sora font-semibold text-foreground">All Clear! No Pending Notifications</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              System health and guardrail checks are operating within normal parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-card border rounded-xl p-4 shadow-xs flex items-start justify-between gap-4 transition-all ${
                  n.isRead
                    ? "border-border/60 opacity-65"
                    : "border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {n.severity === "critical" ? (
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                        <ShieldAlertIcon className="w-4 h-4" />
                      </div>
                    ) : n.severity === "warning" ? (
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                        <AlertTriangleIcon className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                        <InfoIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold font-sora text-foreground">{n.title}</h4>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize font-medium ${
                          n.severity === "critical"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                            : n.severity === "warning"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                        }`}
                      >
                        {n.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground mt-2 inline-block font-mono">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markReadMutation.mutate({ id: n.id })}
                    disabled={markReadMutation.isPending}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
