"use client";

import { PlusIcon, XCircleIcon } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { AgenticDialog } from "@/components/custom/agentic-dialog";
import { useState } from "react";
import { useAgentFilter } from "@/modules/agentic/hooks/useAgenticFilter";
import { AgenticFilter } from "@/components/custom/agentic-filter";
import { DEFAULT_PAGE } from "@/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const AgenticListAdd = () => {
  const [filters, setFilters] = useAgentFilter();
  const [isAgenticDialogOpen, setAgenticDialogOpen] = useState(false);
  const isFilterModify = !!filters.search;
  const onClearFilters = () => {
    setFilters({
      search: "",
      page: DEFAULT_PAGE
    })
  }
  return (
    <>
      <AgenticDialog open={isAgenticDialogOpen} onOpenChange={setAgenticDialogOpen} />
      <div className="flex items-center justify-between mb-4 px-4 py-2 md:px-8">
        <h3 className="text-lg font-semibold text-gray-800">Your Agents</h3>
        <Button type="button" className="flex items-center gap-2" onClick={() => setAgenticDialogOpen(true)}>
          <PlusIcon className="w-4 h-4" />
          Add New Agent
        </Button>
      </div>
      <ScrollArea>
      <div className="flex items-center gap-x-2 ml-4 p-4">
        <AgenticFilter/>
        {
          isFilterModify && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <XCircleIcon/>
            </Button>
          )
        }
      </div>
      <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </>
  );
};
