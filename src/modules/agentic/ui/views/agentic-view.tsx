"use client"

import ErrorDisplay from "@/components/custom/error-display";
import LoadingDisplay from "@/components/custom/loading-display";
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query";

export const AgenticView = () =>{
    const trpc = useTRPC();
    const {data, isLoading, isError} = useQuery(trpc.agents.getMany.queryOptions());
    if (isLoading) return <div><LoadingDisplay title="Loading your agents" description="Hold on tight! It might take a while..."/></div>
    if (isError) return <div><ErrorDisplay title="Error loading your agents" description="Please try again!"/></div>
    return (
        <div>
            {JSON.stringify(data, null, 2)}
        </div>
    );
}