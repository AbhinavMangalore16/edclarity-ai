"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlertIcon,
  CheckCircle2Icon,
  XCircleIcon,
  PencilIcon,
  Loader2Icon,
  ScaleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminReviewQueuePage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "edited" | "rejected">("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [note, setNote] = useState("");

  const { data: items = [], isLoading, refetch } = useQuery(
    trpc.observability.getReviewQueue.queryOptions({ status, limit: 50 }, { refetchInterval: 6000 })
  );

  const decideMutation = useMutation(
    trpc.observability.decideReview.mutationOptions({
      onSuccess: () => {
        toast.success("Review decision recorded & fed into evaluation/LTR set.");
        setEditingId(null);
        setEditedText("");
        setNote("");
        void refetch();
        void qc.invalidateQueries();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to submit review decision");
      },
    })
  );

  return (
    <div className="flex-1 pb-8 px-4 md:px-8 flex flex-col gap-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-xl font-sora font-bold text-foreground flex items-center gap-2 tracking-tight">
            <ScaleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Human-in-the-Loop AI Review Queue
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
              HITL Escalation
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Approve, edit, or reject high-risk, low-groundedness, or user-flagged AI outputs. Decisions feed directly into LTR & guardrail eval sets.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(["pending", "approved", "edited", "rejected", "all"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
              className="h-7 text-xs capitalize rounded-full"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2Icon className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-xl p-12 text-center">
          <CheckCircle2Icon className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
          <p className="text-sm font-semibold text-foreground">No items in the {status} review queue</p>
          <p className="text-xs text-muted-foreground mt-1">
            Outputs escalated by low groundedness, PII/prompt-leak detectors, high-stakes grading, or user 👎 appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id}
                className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 capitalize">
                      {item.feature.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        item.riskScore >= 0.8
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      <ShieldAlertIcon className="w-3 h-3 mr-1 inline" />
                      Risk {(item.riskScore * 100).toFixed(0)}% · {item.reason}
                    </Badge>
                    {item.traceId && (
                      <span className="text-[11px] font-mono text-muted-foreground">trace: {item.traceId}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      User Input
                    </p>
                    <p className="text-foreground whitespace-pre-wrap break-words">{item.input}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {item.editedOutput ? "Reviewed Output (Edited)" : "Model Output"}
                    </p>
                    <p className="text-foreground whitespace-pre-wrap break-words">
                      {item.editedOutput || item.output || "(No output)"}
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col gap-2 pt-2">
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={4}
                      placeholder="Write the corrected response..."
                      className="text-xs"
                    />
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Optional reviewer note (why this was edited/rejected)..."
                      className="text-xs"
                    />
                  </div>
                )}

                {item.status === "pending" && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {!isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                          disabled={decideMutation.isPending}
                          onClick={() => decideMutation.mutate({ id: item.id, decision: "approved" })}
                        >
                          <CheckCircle2Icon className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditedText(item.output || "");
                          }}
                        >
                          <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit & Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                          disabled={decideMutation.isPending}
                          onClick={() => decideMutation.mutate({ id: item.id, decision: "rejected" })}
                        >
                          <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={decideMutation.isPending}
                          onClick={() =>
                            decideMutation.mutate({
                              id: item.id,
                              decision: "edited",
                              editedOutput: editedText,
                              reviewerNote: note,
                            })
                          }
                        >
                          Save Edited Output
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

