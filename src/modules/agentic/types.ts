import {inferRouterOutputs} from "@trpc/server";

import type {AppRouter} from "@/trpc/routers/_app";

export type AgenticGetOne = inferRouterOutputs<AppRouter>["agents"]["getOne"];
export type AgenticGetMany = inferRouterOutputs<AppRouter>["agents"]["getMany"];