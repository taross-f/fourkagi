import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { metricsRouter } from "./routers/metrics";

export const appRouter = createTRPCRouter({
  metrics: metricsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
