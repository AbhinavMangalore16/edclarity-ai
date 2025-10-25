"use client";

// import { DialogCustom } from "@/components/custom/dialog-custom";
// import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query";
import { DataTable } from "../components/agentic-data-table";
import { columns } from "../components/columns";
import EmptyAgents from "@/components/extras/empty-state";
import { useAgentFilter } from "../../hooks/useAgenticFilter";
import { PaginatedData } from "@/components/custom/paginated-data";
import { useRouter } from "next/navigation";



export const AgenticView = () => {
    const trpc = useTRPC();
    const [filters, setFilters] = useAgentFilter();
    const router = useRouter();
    const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions({
        ...filters,
    }));
    return (
        <div className="flex-1 pb-4 px-2 md:px-8 flex flex-col gap-y-4">
            {data.data.length === 0 ? (
                <EmptyAgents
                    title="No agents found!"
                    // description="You don&apos;t have any agents yet. Start by adding one to get personalized automation or assistance."
                />
            ) : (
                <>
                    <DataTable
                        data={data.data}
                        columns={columns}
                        onRowClick={(row)=>router.push(`/agentic/${row.id}`)}
                    />
                    <PaginatedData page={filters.page} totalPages={data.totalPages} onPageChange={(page) => setFilters({ page })} />
                </>
            )}
        </div>
    )
};
