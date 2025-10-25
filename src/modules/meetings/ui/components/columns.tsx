"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MeetingGetMany } from "../../types"
import { createAvatar } from "@dicebear/core";
import { adventurer} from "@dicebear/collection";
import {format} from "date-fns";
import humanizeDuration from "humanize-duration";
import { CircleCheckIcon, CircleXIcon, ClockArrowUpIcon, ClockFadingIcon, CornerDownRightIcon, Loader2Icon, LoaderIcon, VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { cn } from "@/lib/utils";


// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

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
    cancelled: CircleXIcon
}
const statusColors = {
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export const columns: ColumnDef<MeetingGetMany[number], unknown>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <span className="font-semibold capitalize">{row.original.name}</span>
        </div>
        <div className="flex items-center gap-x-1">
          <CornerDownRightIcon className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground max-w-[200px] truncate capitalize">
            {row.original.agent.name}
          </span>
        </div>
        <Avatar seed={row.original.name} />
        <span className="text-sm text-muted-foreground">
            {row.original.startAt? format(row.original.startAt, "MMM dd, yyyy HH:mm"): "Not started yet"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({row}) => {
        const Icon = statusIcons[row.original.status as keyof typeof statusIcons];
        return (
            <Badge variant="outline" className={cn("capitalize [&>svg]:size-4 text-muted-foreground", statusColors[row.original.status as keyof typeof statusColors])}>
                <Icon className={cn(row.original.status==="processing" && "animate-spin")}/> {row.original.status} 
            </Badge>
        )
    }
  },
    {
    accessorKey: "duration",
    header: "Duration",
    cell: ({row}) => (
        <Badge variant="outline" className="capitalize [&>svg]:size-4 flex items-center gap-x-2">
            <ClockFadingIcon className="text-blue-950"/>
            {row.original.duration? formatDuration(row.original.duration): "N/A"}
        </Badge>
    )
  },
];
