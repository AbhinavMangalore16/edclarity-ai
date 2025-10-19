"use client"

// import { DialogCustom } from "@/components/custom/dialog-custom";
// import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query";
import { DataTable } from "../components/data-table";
import { columns } from "../components/columns";
import EmptyAgents from "@/components/extras/empty-agents";
import type { AgenticGetMany } from "@/modules/agentic/types";



export const AgenticView = () => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());
    return (
        <div className="flex-1 pb-4 px-2 md:px-8 flex flex-col gap-y-4">
            {data.length === 0 ? (
                <EmptyAgents
                    title="Create your first agent now!"
                    description="You don&apos;t have any agents yet. Start by adding one to get personalized automation or assistance."
                />
            ) : (
                <DataTable<AgenticGetMany[number], unknown>
                    data={data} 
                    columns={columns}
                />
            )}
        </div>
    )
};
