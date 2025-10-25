"use client";

import { DataTable } from '@/components/custom/data-table';
import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react'
import { columns } from '../components/columns';
import EmptyAgents from '@/components/extras/empty-state';
import { useRouter } from 'next/navigation';
import { useMeetingFilter } from '../../hooks/useMeetingFilter';
import { PaginatedData } from '@/components/custom/paginated-data';


export const MeetingsView = () => {

  const trpc = useTRPC();
  const router = useRouter();
  const [filters, setFilters] = useMeetingFilter();
  const { data } = useSuspenseQuery(trpc.meetings.getMany.queryOptions({...filters}));
  return (
    <div className="flex-1 pb-4 px-2 md:px-8 flex flex-col gap-y-4 overflow-x-scroll">
      <DataTable data={data.data} columns={columns} onRowClick={(row)=>router.push(`/meetings/${row.id}`)} />
      <PaginatedData page={filters.page} totalPages={data.totalCount} onPageChange={(page) => setFilters({ page })} />
      {data.data.length === 0 && (
        <EmptyAgents
          title="No meetings found"
          // description="You don&apos;t have any meetings upcoming. Create a new meeting to get started."
        />
      )}
    </div>
  )
}

