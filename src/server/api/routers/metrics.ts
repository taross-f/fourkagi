import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { GitHubClient } from "~/lib/github";
import { MetricsCollector } from "~/lib/collector";
import { calculateFourKeysMetrics, compareMetrics } from "~/lib/metrics";

const repositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});

const periodSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const metricsRouter = createTRPCRouter({
  getMetrics: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        repositories: z.array(repositorySchema).min(1),
        period: periodSchema,
        comparePrevious: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const client = new GitHubClient(input.token);
      const collector = new MetricsCollector(client);

      const periodStart = new Date(input.period.start);
      const periodEnd = new Date(input.period.end);

      // Calculate period length for comparison
      const periodLength = periodEnd.getTime() - periodStart.getTime();
      const previousStart = new Date(periodStart.getTime() - periodLength);
      const previousEnd = new Date(periodStart.getTime() - 1);

      // Collect data for all repositories
      const allDeployments = [];
      const allIncidents = [];
      const allFailedChanges = [];

      const repoMetrics = [];

      for (const repo of input.repositories) {
        const data = await collector.collectAll(
          repo.owner,
          repo.name,
          periodStart,
          periodEnd
        );

        allDeployments.push(...data.deployments);
        allIncidents.push(...data.incidents);
        allFailedChanges.push(...data.failedChanges);

        // Calculate per-repository metrics
        const repoCurrentMetrics = calculateFourKeysMetrics(
          data.deployments,
          data.failedChanges,
          data.incidents,
          periodStart,
          periodEnd
        );

        repoMetrics.push({
          repository: `${repo.owner}/${repo.name}`,
          metrics: repoCurrentMetrics,
        });
      }

      // Calculate aggregate metrics
      const currentMetrics = calculateFourKeysMetrics(
        allDeployments,
        allFailedChanges,
        allIncidents,
        periodStart,
        periodEnd
      );

      let comparison = null;

      if (input.comparePrevious) {
        const previousDeployments = [];
        const previousIncidents = [];
        const previousFailedChanges = [];

        for (const repo of input.repositories) {
          const data = await collector.collectAll(
            repo.owner,
            repo.name,
            previousStart,
            previousEnd
          );

          previousDeployments.push(...data.deployments);
          previousIncidents.push(...data.incidents);
          previousFailedChanges.push(...data.failedChanges);
        }

        const previousMetrics = calculateFourKeysMetrics(
          previousDeployments,
          previousFailedChanges,
          previousIncidents,
          previousStart,
          previousEnd
        );

        comparison = {
          previous: previousMetrics,
          changes: compareMetrics(currentMetrics, previousMetrics),
        };
      }

      return {
        aggregate: currentMetrics,
        byRepository: repoMetrics,
        comparison,
      };
    }),

  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const client = new GitHubClient(input.token);

      // Try to fetch user info to validate token
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${input.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error("Invalid GitHub token");
      }

      const user = (await response.json()) as { login: string };
      return { valid: true, username: user.login };
    }),

  listUserRepositories: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const response = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=pushed",
        {
          headers: {
            Authorization: `Bearer ${input.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const repos = (await response.json()) as Array<{
        full_name: string;
        name: string;
        owner: { login: string };
      }>;

      return repos.map((repo) => ({
        fullName: repo.full_name,
        owner: repo.owner.login,
        name: repo.name,
      }));
    }),
});
