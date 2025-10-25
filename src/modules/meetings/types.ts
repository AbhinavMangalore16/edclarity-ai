import {inferRouterOutputs} from "@trpc/server";

import type {AppRouter} from "@/trpc/routers/_app";

export type MeetingGetOne = inferRouterOutputs<AppRouter>["meetings"]["getOne"];
export enum MeetingStatus {
    Upcoming = "scheduled",
    Active = "active",
    Processing = "processing",
    Completed = "completed",
    Cancelled = "cancelled",
}
export type MeetingGetMany = inferRouterOutputs<AppRouter>["meetings"]["getMany"]["data"];
