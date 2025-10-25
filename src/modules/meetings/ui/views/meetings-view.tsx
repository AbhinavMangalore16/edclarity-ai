"use client";

import { DataTable } from '@/components/custom/data-table';
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react'
import { columns } from '../components/columns';
import EmptyAgents from '@/components/extras/empty-state';

export const MeetingsView = () => {

    const trpc = useTRPC();
    const {data} = useSuspenseQuery(trpc.meetings.getMany.queryOptions({}));
  return (
    <div className="flex-1 pb-4 px-2 md:px-8 flex flex-col gap-y-4 overflow-x-scroll">
      <DataTable data={data.data} columns={columns}/>  
                  {data.data.length === 0 && (
                      <EmptyAgents
                          title="No meetings yet"
                          description="You don&apos;t have any meetings upcoming. Create a new meeting to get started."
                      />
                  ) }
    </div>
  )
}

