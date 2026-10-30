"use client";

import { PlusIcon, XCircleIcon } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { AgenticDialog } from "@/components/custom/agentic-dialog";
import { useState } from "react";
import { useAgentFilter } from "@/modules/agentic/hooks/useAgenticFilter";
import { AgenticFilter } from "@/components/custom/agentic-filter";
import { DEFAULT_PAGE } from "@/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";

export const AgenticListAdd = () => {
  const trpc = useTRPC();
  const [filters, setFilters] = useAgentFilter();
  const [isAgenticDialogOpen, setAgenticDialogOpen] = useState(false);
  
  const { data: currentUser } = useQuery(trpc.lms.getCurrentUser.queryOptions());
  const { data } = useQuery(trpc.agents.getMany.queryOptions({ ...filters }));
  const remainingAgents = data?.remainingAgents ?? 5;
  const isFilterModify = !!filters.search;

  const canCreateAgent = currentUser?.role === "teacher" || currentUser?.role === "admin";

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
        <div className="flex items-center gap-x-3">
          <h3 className="text-lg font-semibold text-foreground">
            {canCreateAgent ? "Your EdTutors" : "Class EdTutors Catalog"}
          </h3>
          {canCreateAgent ? (
            <Badge variant={remainingAgents === 0 ? "destructive" : "secondary"}>
              {remainingAgents} {remainingAgents === 1 ? "agent" : "agents"} remaining
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
              Configured by Instructors
            </Badge>
          )}
        </div>

        {canCreateAgent && (
          <Button type="button" className="flex items-center gap-2" onClick={() => setAgenticDialogOpen(true)}>
            <PlusIcon className="w-4 h-4" />
            Add New EdTutor
          </Button>
        )}
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
