"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AgenticGetMany, AgenticGetOne } from "../../types"
import { createAvatar } from "@dicebear/core";
import { adventurer} from "@dicebear/collection";
import { CornerDownRightIcon, VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";


// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export const Avatar = ({ seed }: { seed: string }) => {
  const uri = useMemo(() => createAvatar(adventurer, { seed }).toDataUri(), [seed]);
  return <img src={uri} className="size-8" alt="Avatar" />;
};

export const columns: ColumnDef<AgenticGetMany["data"][number], unknown>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <Avatar seed={row.original.name} />
          <span className="font-semibold capitalize">{row.original.name}</span>
        </div>
        <div className="flex items-center gap-x-3">
          <CornerDownRightIcon className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground max-w-[200px] truncate capitalize">
            {row.original.instructions}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "meetingCount",
    header: "Meetings",
    cell: ({row}) => {
      const remaining = Math.max(0, 3 - row.original.meetingCount);
      return (
        <Badge variant={remaining === 0 ? "destructive" : "outline"} className="flex gap-x-2 w-fit">
          <VideoIcon className={remaining === 0 ? "text-white" : "text-green-800"} />
          {remaining} {remaining === 1 ? "meeting" : "meetings"} remaining
        </Badge>
      );
    },
  },
];
