"use client"

import { DialogCustom } from "@/components/custom/dialog-custom";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query";

export const AgenticView = () => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());
    return (
        <>
        {/* <DialogCustom title="Agents" description="List of agents" open onOpenChange={()=>{}}>
            <Button>
                Button click!
            </Button>
        </DialogCustom> */}
        {JSON.stringify(data, null, 2)}
        </>
    )
};
