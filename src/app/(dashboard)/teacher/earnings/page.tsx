"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSignIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  BookOpenIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ArrowUpRightIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TeacherEarningsPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.lms.getTeacherEarnings.queryOptions());

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || { totalSales: 0, totalGross: 0, totalPlatformFee: 0, totalNet: 0 };
  const earnings = data?.earnings || [];

  return (
    <>
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Teacher Revenue & Payout Ledger</h3>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              85% Instructor Split Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Track real-time course sales revenue, platform fees, and cleared payout history.
          </p>
        </div>

        <Link href="/teacher/courses">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <BookOpenIcon className="w-3.5 h-3.5" /> Manage Courses
          </Button>
        </Link>
      </div>

      <div className="flex-1 pb-6 px-4 md:px-8 flex flex-col gap-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-medium">Net Instructor Payout (85%)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <DollarSignIcon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">
                ₹{(stats.totalNet / 100).toLocaleString("en-IN")}
              </span>
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2Icon className="w-3.5 h-3.5" /> Cleared for instant payout
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-medium">Gross Course Sales</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                <TrendingUpIcon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">
                ₹{(stats.totalGross / 100).toLocaleString("en-IN")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                From {stats.totalSales} student enrollment{stats.totalSales === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-medium">Platform Share (15%)</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <ShieldCheckIcon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">
                ₹{(stats.totalPlatformFee / 100).toLocaleString("en-IN")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Covers AI inference & hosting</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-medium">Total Enrollments</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <CreditCardIcon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">{stats.totalSales}</span>
              <p className="text-[11px] text-muted-foreground mt-1">Confirmed transactions</p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 text-emerald-600" /> Revenue Ledger History
            </h4>
            <span className="text-xs text-muted-foreground font-mono">Dodo Payments MoR</span>
          </div>

          {earnings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <DollarSignIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium">No course sales recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When students purchase your LMS courses, earnings will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/30">
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Course Title</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Gross Sale</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Platform Fee (15%)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Your Net Payout (85%)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {earnings.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {item.course?.title || "LMS Course"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        ₹{(item.grossAmount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        -₹{(item.platformFee / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        +₹{(item.netAmount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
                          {item.status}
                        </Badge>
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
