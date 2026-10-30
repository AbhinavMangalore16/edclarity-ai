"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  SearchIcon,
  ZapIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  ClockIcon,
  Loader2Icon,
  FilterIcon,
  TerminalIcon,
  BellIcon,
  CpuIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function AdminObservabilityPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "flagged" | "error">("all");
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: loadingStats } = useQuery(
    trpc.observability.getObservabilityStats.queryOptions(undefined, { refetchInterval: 5000 })
  );

  const { data: traceData, isLoading: loadingTraces } = useQuery(
    trpc.observability.getTraces.queryOptions(
      { search, feature: featureFilter, status: statusFilter, page, pageSize: 12 },
      { refetchInterval: 5000 }
    )
  );

  if (loadingStats) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  const s = stats || {
    totalCalls: 0,
    avgLatency: 0,
    p50Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    guardrailPassRate: 100,
    cacheHitRate: 0,
    fallbackRate: 0,
    errorRate: 0,
    flaggedCount: 0,
    unreadAlertsCount: 0,
    pendingReviewsCount: 0,
  };
  const traces = traceData?.data || [];

  return (
    <>
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 px-4 py-2 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-sora font-bold text-foreground flex items-center gap-2 tracking-tight">
              <ActivityIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" /> AI Observability & Telemetry
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-medium">
                LLM Telemetry
              </Badge>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time execution traces, p50/p95/p99 latency, semantic cache hit rates, cost tracking, and HITL escalation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/review">
            <Button variant="outline" size="sm" className="relative gap-1.5 text-xs border-border hover:bg-accent">
              <ShieldAlertIcon className="w-3.5 h-3.5 text-purple-500" />
              <span>HITL Review Queue</span>
              {s.pendingReviewsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {s.pendingReviewsCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/admin/notifications">
            <Button variant="outline" size="sm" className="relative gap-1.5 text-xs border-border hover:bg-accent">
              <BellIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Alert Notifications</span>
              {s.unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {s.unreadAlertsCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 pb-6 px-4 md:px-8 flex flex-col gap-y-6">
        {/* Observability Telemetry Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card border border-border/80 hover:border-purple-500/30 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total LLM Calls</span>
              <CpuIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="text-2xl font-bold font-sora text-foreground">{s.totalCalls}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cache Hit: <span className="text-emerald-500 font-semibold">{s.cacheHitRate}%</span> · Fallback: {s.fallbackRate}%
              </p>
            </div>
          </div>

          <div className="bg-card border border-border/80 hover:border-purple-500/30 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latency (p50 / p95 / p99)</span>
              <ClockIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="text-2xl font-bold font-sora text-foreground">{s.avgLatency} ms</span>
              <p className="text-[11px] mt-0.5 font-mono text-muted-foreground">
                p50: {s.p50Latency}ms · p95: {s.p95Latency}ms · p99: {s.p99Latency}ms
              </p>
            </div>
          </div>

          <div className="bg-card border border-border/80 hover:border-purple-500/30 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tokens & Cost</span>
              <ZapIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="text-2xl font-bold font-sora text-foreground">{s.totalTokens.toLocaleString()}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Est. Spend: <span className="font-mono font-semibold text-foreground">${s.totalCostUsd}</span>
              </p>
            </div>
          </div>

          <div className="bg-card border border-border/80 hover:border-purple-500/30 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guardrail Safety</span>
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-2xl font-bold font-sora text-emerald-500">{s.guardrailPassRate}%</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Error rate: {s.errorRate}% · Pending HITL: {s.pendingReviewsCount}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border/80 hover:border-purple-500/30 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Violations</span>
              <ShieldAlertIcon className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <span className={`text-2xl font-bold font-sora ${s.flaggedCount > 0 ? "text-rose-500" : "text-foreground"}`}>
                {s.flaggedCount}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Flagged safety alerts</p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-3.5 shadow-xs">
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search LLM prompt traces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-background border-border"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <FilterIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              className="h-7 text-xs rounded-full"
            >
              All Traces
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "success" ? "default" : "outline"}
              onClick={() => setStatusFilter("success")}
              className="h-7 text-xs rounded-full text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              Passed
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "flagged" ? "default" : "outline"}
              onClick={() => setStatusFilter("flagged")}
              className="h-7 text-xs rounded-full text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              Flagged Violations
            </Button>
          </div>
        </div>

        {/* Real-time Trace Log Table */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h4 className="text-sm font-semibold font-sora text-foreground flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" /> LLM Execution Trace Stream
            </h4>
            <span className="text-xs text-muted-foreground font-mono">Live Telemetry</span>
          </div>

          {loadingTraces ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2Icon className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
          ) : traces.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CpuIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">No LLM traces recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Execution traces and telemetry automatically log here when queries are sent to Clarities, Persona Mode, or AI Notetakers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/40">
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Feature</th>
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Model</th>
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Prompt Snippet</th>
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px] text-right">Tokens</th>
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px] text-right">Latency</th>
                    <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {traces.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                        {new Date(t.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground capitalize">
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                          {t.feature.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                        {t.model}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-foreground font-medium">
                        "{t.promptSnippet}"
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {t.totalTokens || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        <span className={t.latencyMs > 2000 ? "text-amber-500 font-bold" : "text-foreground"}>
                          {t.latencyMs} ms
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {t.status === "flagged" ? (
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
                            🚨 Flagged
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            ✓ Passed
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
