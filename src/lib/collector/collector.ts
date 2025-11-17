import { type GitHubClient } from "~/lib/github";
import {
  type DeploymentData,
  type IncidentData,
  type FailedChangeData,
} from "~/lib/metrics";
import { type CollectorConfig, defaultCollectorConfig } from "./types";

export class MetricsCollector {
  private client: GitHubClient;
  private config: CollectorConfig;

  constructor(client: GitHubClient, config?: Partial<CollectorConfig>) {
    this.client = client;
    this.config = { ...defaultCollectorConfig, ...config };
  }

  async collectDeployments(
    owner: string,
    repo: string,
    since: Date,
    until: Date
  ): Promise<DeploymentData[]> {
    const mergedPRs = await this.client.getMergedPullRequests({
      owner,
      repo,
      since,
      until,
    });

    const deployments: DeploymentData[] = [];

    for (const pr of mergedPRs) {
      if (!pr.merged_at || !pr.merge_commit_sha) continue;

      const mergedAt = new Date(pr.merged_at);
      const createdAt = new Date(pr.created_at);

      // Lead time: from PR creation to merge
      const leadTimeSeconds = Math.floor(
        (mergedAt.getTime() - createdAt.getTime()) / 1000
      );

      deployments.push({
        sha: pr.merge_commit_sha,
        deployedAt: mergedAt,
        leadTimeSeconds,
      });
    }

    return deployments;
  }

  async collectIncidents(
    owner: string,
    repo: string,
    since: Date,
    until: Date
  ): Promise<IncidentData[]> {
    const incidentIssues: IncidentData[] = [];

    for (const label of this.config.incidentLabels) {
      const issues = await this.client.getIssuesWithLabel({
        owner,
        repo,
        since,
        until,
        label,
      });

      for (const issue of issues) {
        const createdAt = new Date(issue.created_at);
        const resolvedAt = issue.closed_at ? new Date(issue.closed_at) : null;

        let timeToRestoreSeconds: number | null = null;
        if (resolvedAt) {
          timeToRestoreSeconds = Math.floor(
            (resolvedAt.getTime() - createdAt.getTime()) / 1000
          );
        }

        incidentIssues.push({
          issueNumber: issue.number,
          createdAt,
          resolvedAt,
          timeToRestoreSeconds,
        });
      }
    }

    // Remove duplicates by issue number
    const uniqueIncidents = new Map<number, IncidentData>();
    for (const incident of incidentIssues) {
      uniqueIncidents.set(incident.issueNumber, incident);
    }

    return Array.from(uniqueIncidents.values());
  }

  async collectFailedChanges(
    owner: string,
    repo: string,
    since: Date,
    until: Date
  ): Promise<FailedChangeData[]> {
    const failedChanges: FailedChangeData[] = [];

    // Collect revert commits
    const commits = await this.client.getCommits({
      owner,
      repo,
      since,
      until,
    });

    for (const commit of commits) {
      const isRevert = this.config.revertPatterns.some((pattern) =>
        pattern.test(commit.commit.message)
      );

      if (isRevert) {
        failedChanges.push({
          type: "revert_commit",
          detectedAt: new Date(commit.commit.author.date),
          identifier: commit.sha,
        });
      }
    }

    // Collect hotfix/incident PRs
    const hotfixPRs = await this.client.getPullRequestsWithLabels({
      owner,
      repo,
      since,
      until,
      labels: this.config.hotfixLabels,
    });

    for (const pr of hotfixPRs) {
      if (!pr.merged_at) continue;

      const hasIncidentLabel = pr.labels.some(
        (l) => l.name === "incident" || this.config.incidentLabels.includes(l.name)
      );

      failedChanges.push({
        type: hasIncidentLabel ? "incident_pr" : "hotfix_pr",
        detectedAt: new Date(pr.merged_at),
        identifier: `PR#${pr.number}`,
      });
    }

    return failedChanges;
  }

  async collectAll(
    owner: string,
    repo: string,
    since: Date,
    until: Date
  ): Promise<{
    deployments: DeploymentData[];
    incidents: IncidentData[];
    failedChanges: FailedChangeData[];
  }> {
    const [deployments, incidents, failedChanges] = await Promise.all([
      this.collectDeployments(owner, repo, since, until),
      this.collectIncidents(owner, repo, since, until),
      this.collectFailedChanges(owner, repo, since, until),
    ]);

    return { deployments, incidents, failedChanges };
  }
}
