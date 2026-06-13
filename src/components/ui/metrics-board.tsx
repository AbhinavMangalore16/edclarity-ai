"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Metrics {
  faithfulness: number;
  hallucination: number;
}

interface PerformanceMetrics {
  total_time: number;
  query_rewriting?: number;
  multi_query_generation?: number;
  hybrid_retrieval?: number;
  reranking?: number;
  context_compression?: number;
  citation_building?: number;
  llm_generation?: number;
  evaluation?: number;
  [key: string]: number | undefined;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  metrics?: Metrics;
  performance_metrics?: PerformanceMetrics;
}

interface MetricsBoardProps {
  messages: ChatMessage[];
}

const evalChartConfig = {
  faithfulness: {
    label: "Faithfulness (%)",
    color: "hsl(var(--chart-2))",
  },
  hallucination: {
    label: "Hallucination (%)",
    color: "hsl(var(--chart-1))",
  },
};

const perfChartConfig = {
  time: {
    label: "Time (s)",
    color: "hsl(var(--chart-3))",
  },
};

export function MetricsBoard({ messages }: MetricsBoardProps) {
  // Extract agent messages that have metrics
  const agentMessages = useMemo(() => {
    return messages.filter((m) => m.role === "agent" && m.metrics && m.performance_metrics);
  }, [messages]);

  // Data for Line Chart (Evaluation Metrics over time/queries)
  const evalData = useMemo(() => {
    return agentMessages.map((msg, index) => ({
      query: `Q${index + 1}`,
      faithfulness: msg.metrics ? msg.metrics.faithfulness : 0,
      hallucination: msg.metrics ? msg.metrics.hallucination : 0,
    }));
  }, [agentMessages]);

  // Data for Bar Chart (Latest Performance breakdown)
  const perfData = useMemo(() => {
    if (agentMessages.length === 0) return [];
    const latestPerf = agentMessages[agentMessages.length - 1].performance_metrics;
    if (!latestPerf) return [];

    const stages = [
      { key: "query_rewriting", label: "Rewrite" },
      { key: "multi_query_generation", label: "Multi-Query" },
      { key: "hybrid_retrieval", label: "Retrieval" },
      { key: "reranking", label: "Rerank" },
      { key: "context_compression", label: "Compress" },
      { key: "citation_building", label: "Citation" },
      { key: "llm_generation", label: "LLM Gen" },
      { key: "evaluation", label: "Eval" },
    ];

    return stages.map(stage => ({
      stage: stage.label,
      time: latestPerf[stage.key] || 0,
    })).filter(d => d.time > 0);
  }, [agentMessages]);

  if (agentMessages.length === 0) {
    return (
      <Card className="flex-1 flex flex-col items-center justify-center h-full border-purple-100 dark:border-purple-900/30 bg-white/80 dark:bg-zinc-950/80 shadow-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No metrics available yet. Send a query to populate the board.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full border-purple-100 dark:border-purple-900/30 bg-white/80 dark:bg-zinc-950/80 shadow-md overflow-hidden min-w-[300px] w-full max-w-sm md:max-w-md">
      <CardHeader className="pb-2 border-b border-purple-100 dark:border-purple-900/30 flex-shrink-0">
        <CardTitle className="text-lg">Clarity Mode Metrics</CardTitle>
        <CardDescription>Session evaluation and performance breakdown</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {/* Evaluation Line Chart */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Response Quality (Scores %)</h3>
            <ChartContainer config={evalChartConfig} className="min-h-[200px] w-full">
              <LineChart data={evalData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="query" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="faithfulness" stroke="hsl(var(--chart-2))" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="hallucination" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Performance Bar Chart */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Latest Query Latency Breakdown</h3>
            <ChartContainer config={perfChartConfig} className="min-h-[200px] w-full">
              <BarChart data={perfData} layout="vertical" margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="time" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30">
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Avg Total Time</div>
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {(agentMessages.reduce((acc, msg) => acc + (msg.performance_metrics?.total_time || 0), 0) / agentMessages.length).toFixed(2)}s
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/30">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">Avg Faithfulness</div>
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {(agentMessages.reduce((acc, msg) => acc + (msg.metrics?.faithfulness || 0), 0) / agentMessages.length).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
