"use client";

import { useEffect, useState } from "react";
import { 
  PlayIcon, 
  RefreshCwIcon, 
  WorkflowIcon, 
  CheckCircle2Icon, 
  ClockIcon, 
  CpuIcon, 
  ExternalLinkIcon,
  SparklesIcon,
  LayersIcon,
  ShieldAlertIcon,
  Loader2Icon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Link from "next/link";

interface DagItem {
  dag_id: string;
  description: string;
  is_paused: boolean;
  schedule_interval: { type: string; value: string } | string;
  tags: { name: string }[];
  owners: string[];
  last_parsed_time?: string;
}

export const AirflowDashboard = () => {
  const trpc = useTRPC();
  const { data: currentUser, isLoading: userLoading } = useQuery(trpc.lms.getCurrentUser.queryOptions());

  const [dags, setDags] = useState<DagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringDag, setTriggeringDag] = useState<string | null>(null);

  const fetchDags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/airflow/dags");
      const data = await res.json();
      if (data.success) {
        setDags(data.dags || []);
      }
    } catch (err) {
      toast.error("Failed to load Airflow pipelines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDags();
  }, []);

  const handleTriggerDag = async (dagId: string) => {
    setTriggeringDag(dagId);
    try {
      const res = await fetch("/api/airflow/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dagId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Pipeline Triggered! ${data.message || ""}`, {
          description: `Run ID: ${data.dagRunId || "active"}`,
        });
      } else {
        toast.error("Failed to trigger pipeline.");
      }
    } catch (err) {
      toast.error("Failed to communicate with Airflow server.");
    } finally {
      setTriggeringDag(null);
    }
  };

  const getScheduleDisplay = (schedule: any) => {
    if (!schedule) return "Manual";
    if (typeof schedule === "string") return schedule;
    return schedule.value || "Daily";
  };

  if (userLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // RBAC Admin Protection
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
          <ShieldAlertIcon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Admin Access Required</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Apache Airflow DAG pipeline orchestration is restricted to Admin users. Use the bottom profile menu to switch your role to Admin.
        </p>
        <Link href="/courses">
          <Button variant="outline" size="sm">Back to LMS Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Apache Airflow Pipelines</h3>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              {dags.length} DAGs
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Automated Mux video transcript indexing, offline tutor knowledge distillation, and pgvector maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDags}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="w-3.5 h-3.5 mr-1.5" />
              Airflow UI
            </a>
          </Button>
        </div>
      </div>

      <div className="flex-1 pb-6 px-4 md:px-8 flex flex-col gap-6">
        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Pipelines</p>
              <p className="text-xl font-bold text-foreground">{dags.length} Workflows</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <CpuIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">ETL Engine Status</p>
              <p className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Healthy
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <LayersIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Executor Architecture</p>
              <p className="text-sm font-semibold text-foreground">LocalExecutor (Docker Container)</p>
            </div>
          </div>
        </div>

        {/* Configured Workflows */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-purple-600" />
            EdClarity AI Pipeline Workflows
          </h4>

          {loading ? (
            <div className="flex justify-center items-center p-12 bg-card rounded-xl border border-border">
              <RefreshCwIcon className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {dags.map((dag) => (
                <div
                  key={dag.dag_id}
                  className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-purple-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {dag.dag_id}
                      </span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        {dag.is_paused ? "Paused" : "Active"}
                      </Badge>
                      <Badge variant="outline" className="bg-muted/60 text-muted-foreground font-mono text-[11px]">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {getScheduleDisplay(dag.schedule_interval)}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                      {dag.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {dag.tags?.map((t) => (
                        <span key={t.name} className="px-2 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-700 border border-purple-100">
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                      onClick={() => handleTriggerDag(dag.dag_id)}
                      disabled={triggeringDag === dag.dag_id}
                      size="sm"
                      className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
                    >
                      <PlayIcon className={`w-3.5 h-3.5 mr-1.5 ${triggeringDag === dag.dag_id ? "animate-pulse" : ""}`} />
                      {triggeringDag === dag.dag_id ? "Triggering..." : "Trigger DAG"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AirflowDashboard;
