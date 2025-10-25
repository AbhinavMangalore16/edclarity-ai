"use client";
import { useState } from "react";
import { PlusIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingDialog } from "./meeting-dialog";
import { MeetingFilter } from "@/components/custom/meeting-filter";
import { StatusFilter } from "./status-filter";
import { AgentIDFilter } from "./agentIDFilter";


export const MeetingListAdd = () => {
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  return (
    <>
      <MeetingDialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen} />
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <h3 className="text-lg font-semibold text-gray-800">Your Meetings</h3>
        <Button type="button" className="flex items-center gap-2" onClick={() => { setIsMeetingDialogOpen(true) }}>
          <PlusIcon className="w-4 h-4" />
          Add New Meeting
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 ml-4 p-4">
        <div className="w-full sm:w-auto">
          <MeetingFilter />
        </div>
        <div className="w-full sm:w-auto gap-2 flex">
          <AgentIDFilter />
          <StatusFilter />
        </div>
      </div>

    </>
  );
};
