"use client";

import { DataTable } from '@/components/custom/data-table';
import { useTRPC } from '@/trpc/client';
import { useQuery, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { columns } from '../components/columns';
import EmptyAgents from '@/components/extras/empty-state';
import { useRouter } from 'next/navigation';
import { useMeetingFilter } from '../../hooks/useMeetingFilter';
import { PaginatedData } from '@/components/custom/paginated-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon, UserCheckIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const MeetingsView = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useMeetingFilter();
  const { data } = useSuspenseQuery(trpc.meetings.getMany.queryOptions({...filters}));
  
  const { data: currentUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());
  const isTeacherOrAdmin = currentUser?.role === "teacher" || currentUser?.role === "admin";

  const { data: pendingRequests } = useQuery(
    trpc.meetings.getPendingRequests.queryOptions(undefined, {
      enabled: isTeacherOrAdmin,
    })
  );

  const approveMutation = useMutation(
    trpc.meetings.approveStudent.mutationOptions({
      onSuccess: () => {
        toast.success("Student admission status updated!");
        queryClient.invalidateQueries({ queryKey: trpc.meetings.getPendingRequests.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.meetings.getMany.queryKey() });
      },
      onError: () => {
        toast.error("Failed to update student admission.");
      },
    })
  );

  return (
    <div className="flex-1 pb-4 px-2 md:px-8 flex flex-col gap-y-4 overflow-x-scroll">
      
      {/* Teacher Live Class Admission Control Banner */}
      {isTeacherOrAdmin && pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-400/30 rounded-2xl p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <UserCheckIcon className="size-5 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              Pending Live Class Admission Requests 
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-xs">
                {pendingRequests.length} Pending
              </Badge>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white/80 border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-bold text-xs text-slate-900 truncate">{req.userName || req.userEmail}</span>
                  <span className="text-[11px] text-slate-500 truncate">Class: <span className="font-medium text-slate-700">{req.meetingName}</span></span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    type="button"
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ enrollmentId: req.id, status: "approved" })}
                  >
                    <CheckIcon className="size-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="h-7 px-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold rounded-lg"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ enrollmentId: req.id, status: "rejected" })}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable data={data.data} columns={columns} onRowClick={(row)=>router.push(`/meetings/${row.id}`)} />
      <PaginatedData page={filters.page} totalPages={data.totalCount} onPageChange={(page) => setFilters({ page })} />
      {data.data.length === 0 && (
        <EmptyAgents
          title="No meetings found"
          // description="You don&apos;t have any meetings upcoming. Create a new meeting to get started."
        />
      )}
    </div>
  );
};

