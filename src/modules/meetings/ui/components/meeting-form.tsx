"use client";

import { meetingSchema } from "@/modules/meetings/schemas";
import { MeetingGetOne } from "@/modules/meetings/types";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { CustomAvatar } from "@/components/extras/custom-avatar";
import { useState } from "react";
import { Selection } from "@/components/extras/selection";
import { AgenticDialog } from "@/components/custom/agentic-dialog";

interface MeetingFormProps {
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
  initValues?: MeetingGetOne;
}

export const MeetingForm = ({ onSuccess, onCancel, initValues }: MeetingFormProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [openAgentic, setOpenAgentic] = useState(false);
  const [searchAgent, setSearchAgent] = useState("");
  const agentis = useQuery(
    trpc.agents.getMany.queryOptions({pageSize: 10, search: searchAgent}),
  )

  // Mutations
  const createMeeting = useMutation(
    trpc.meetings.create.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
        toast.success("Meeting created successfully!");
        onSuccess?.(data.id);
      },
      onError: (error) => {
        toast.error(`Failed to create meeting: ${error.message}`);
      },
    })
  );

  const updateMeeting = useMutation(
    trpc.meetings.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
        if (initValues?.id){
          await queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({id: initValues.id}))
        }
        toast.success("Meeting updated successfully!");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(`Failed to update meeting: ${error.message}`);
      },
    })
  );

  // Form setup
  const form = useForm<z.infer<typeof meetingSchema>>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      name: initValues?.name ?? "",
      agentId: initValues?.agentId ?? "",
    },
  });

  const isEdit = !!initValues?.id;
  const isPending = createMeeting.isPending || updateMeeting.isPending;

  // Submission
  const onSubmit = (values: z.infer<typeof meetingSchema>) => {
    if (isEdit) {
      updateMeeting.mutate({ ...values, id: initValues!.id });
    } else {
      createMeeting.mutate(values);
    }
  };

  return (
    <>
    <AgenticDialog open={openAgentic} onOpenChange={setOpenAgentic} />
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Avatar */}
        {/* <div className="flex justify-center">
          <CustomAvatar
            seed={form.watch("name")}
            variant="adventurer"
            className="border size-16 w-16 h-16 mb-4"
          />
        </div> */}

        {/* Meeting Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Studying..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Agent ID */}
        <FormField
          control={form.control}
          name="agentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent</FormLabel>
              <FormControl>
                <Selection options={(agentis.data?.data ?? []).map((agent) => ({
                  id: agent.id,
                  value: agent.id,
                  children: (
                    <div className="flex items-center gap-x-2">
                      <CustomAvatar seed={agent.name} variant="adventurer" />
                      <span>{agent.name}</span>
                    </div>
                  ),
                }))} placeholder="Select an agent" onSearch={setSearchAgent} value={field.value} onSelect={field.onChange} />
              </FormControl>
              <FormDescription>
                Didn&apos;t find an agent?
                <Button type="button" variant="link" className="p-0 ml-1 text-primary hover:underline" onClick={() => setOpenAgentic(true)}>
                  Create a new one here!
                </Button>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buttons */}
        <div className="flex justify-between gap-x-2.5">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isEdit ? "Update Meeting" : "Schedule Meeting"}
          </Button>
        </div>
      </form>
    </Form>
  </>
  );
};
