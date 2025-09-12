"use client"

import { useTRPC } from "@/trpc/client"
import { useSuspenseQuery } from "@tanstack/react-query";

export const AgenticView = () => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());

    if (!data || data.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500">
                No agents found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full border-collapse bg-white text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                    <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Instructions</th>
                        <th className="px-4 py-3">Metadata</th>
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3">Updated At</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((agent) => (
                        <tr
                            key={agent.id}
                            className="border-b hover:bg-gray-50 transition"
                        >
                            <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-xs truncate">
                                {agent.id}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{agent.name}</td>
                            <td className="px-4 py-3 max-w-sm truncate">{agent.instructions}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{agent.metadata ?? "—"}</td>
                            <td className="px-4 py-3">{agent.userId}</td>
                            <td className="px-4 py-3">
                                {new Date(agent.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                                {new Date(agent.updatedAt).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
