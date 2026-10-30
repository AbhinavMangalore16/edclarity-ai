"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MeetingGetMany } from "../../types";
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";
import { format } from "date-fns";
import humanizeDuration from "humanize-duration";
import {
  CircleCheckIcon,
  CircleXIcon,
  ClockArrowUpIcon,
  ClockFadingIcon,
  Loader2Icon,
  LoaderIcon,
  VideoIcon,
  CornerDownRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  UserPlusIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Avatar = ({ seed }: { seed: string }) => {
  const uri = useMemo(() => createAvatar(adventurer, { seed }).toDataUri(), [seed]);
  return <img src={uri} className="size-8" alt="Avatar" />;
};

function formatDuration(seconds: number) {
  return humanizeDuration(seconds * 1000, { largest: 2, round: true, units: ["h", "m", "s"] });
}

const statusIcons = {
  scheduled: ClockArrowUpIcon,
  active: Loader2Icon,
  processing: LoaderIcon,
  completed: CircleCheckIcon,
  cancelled: CircleXIcon,
};

const statusColors = {
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const AdmissionCell = ({ meetingId, status }: { meetingId: string; status?: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const requestAccessMutation = useMutation(trpc.meetings.requestAccess.mutationOptions({
    onSuccess: () => {
      toast.success("Admission request submitted to teacher!");
      queryClient.invalidateQueries({ queryKey: trpc.meetings.getMany.queryKey() });
    },
    onError: () => {
      toast.error("Failed to request admission.");
    }
  }));

  if (status === "approved") {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1 font-semibold text-xs w-fit">
        <CheckCircle2Icon className="size-3.5" />
        Approved
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1 font-semibold text-xs w-fit">
        <ClockIcon className="size-3.5" />
        Pending Approval
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      type="button"
      className="h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold"
      disabled={requestAccessMutation.isPending}
      onClick={(e) => {
        e.stopPropagation();
        requestAccessMutation.mutate({ meetingId });
      }}
    >
      <UserPlusIcon className="size-3.5 mr-1" />
      {requestAccessMutation.isPending ? "Requesting..." : "Request Access"}
    </Button>
  );
};

export const columns: ColumnDef<MeetingGetMany[number], unknown>[] = [
  {
    accessorKey: "name",
    header: "Class Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <Avatar seed={row.original.name} />
          <span className="font-semibold capitalize">{row.original.name}</span>
        </div>
        <div className="flex items-center gap-x-1">
          <CornerDownRightIcon className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground max-w-[200px] truncate capitalize">
            EdTutor: {row.original.agent.name}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "userEnrollmentStatus",
    header: "Admission",
    cell: ({ row }) => (
      <AdmissionCell 
        meetingId={row.original.id} 
        status={(row.original as any).userEnrollmentStatus} 
      />
    ),
  },
  {
    accessorKey: "startAt",
    header: "Start Time",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.startAt
          ? format(row.original.startAt, "MMM dd, yyyy HH:mm")
          : "Not started yet"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const Icon = statusIcons[row.original.status as keyof typeof statusIcons];
      return (
        <Badge
          variant="outline"
          className={cn(
            "capitalize [&>svg]:size-4 text-muted-foreground flex items-center gap-x-2",
            statusColors[row.original.status as keyof typeof statusColors]
          )}
        >
          <Icon className={cn(row.original.status === "processing" && "animate-spin")} />
          {row.original.status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="capitalize [&>svg]:size-4 flex items-center gap-x-2"
      >
        <ClockFadingIcon className="text-blue-950" />
        {row.original.duration ? formatDuration(row.original.duration) : "N/A"}
      </Badge>
    ),
  },
];
