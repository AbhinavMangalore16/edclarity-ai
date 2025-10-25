import { useTRPC } from "@/trpc/client";
import { useMeetingFilter } from "../../hooks/useMeetingFilter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CustomAvatar } from "@/components/extras/custom-avatar";
import { Selection } from "@/components/extras/selection"; // adjust import path

export const AgentIDFilter = () => {
  const [filters, setFilters] = useMeetingFilter();
  const trpc = useTRPC();
  const [agenticSearch, setAgenticSearch] = useState("");

  const { data } = useQuery(
    trpc.agents.getMany.queryOptions({
      pageSize: 10,
      search: agenticSearch,
    })
  );
  // console.log("AgentIDFilter data:", data);

  return (
    <Selection
      className="h-9 "
      placeholder={"Select Agent"}
      options={(data?.data ?? []).map((agent) => ({
        id: agent.id,
        value: agent.id,
        children: (
          <div className="flex items-center gap-x-2">
            <CustomAvatar
              seed={agent.name}
              variant="adventurer"
            />
            <span>{agent.name}</span>
          </div>
        ),
      }))}
      value={filters.agentId ?? ""}
      onSelect={(value) => setFilters({ agentId: value })}
      onSearch={setAgenticSearch}
    />
  );
};
