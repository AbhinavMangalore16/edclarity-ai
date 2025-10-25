"use client";
import { useState } from "react";
import { PlusIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingDialog } from "./meeting-dialog";
import { MeetingFilter } from "@/components/custom/meeting-filter";
import { StatusFilter } from "./status-filter";
import { AgentIDFilter } from "./agentIDFilter";
import { useMeetingFilter } from "../../hooks/useMeetingFilter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DEFAULT_PAGE } from "@/constants";


export const MeetingListAdd = () => {
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [filters, setFilters] = useMeetingFilter();
  const isFilterActive = !!filters.status || !!filters.search || !!filters.agentId;
  const onClearFilter = () =>{
    setFilters({
      status: null,
      agentId: "", 
      search: "",
      page: DEFAULT_PAGE,
    })
  }
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
      <ScrollArea>
      <div className="flex flex-wrap items-center gap-2 ml-4 p-4">
        <div className="w-full sm:w-auto">
          <MeetingFilter />
        </div>
        <div className="w-full sm:w-auto gap-2 flex">
          <StatusFilter />
          <AgentIDFilter />
          {isFilterActive && (
            <Button variant="outline" className="flex items-center gap-2" onClick={onClearFilter}>
              <XCircleIcon className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </div>
      </ScrollArea>

    </>
  );
};
