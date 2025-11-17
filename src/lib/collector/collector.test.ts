import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetricsCollector } from "./collector";
import { GitHubClient } from "~/lib/github";

describe("MetricsCollector", () => {
  let mockClient: GitHubClient;
  let collector: MetricsCollector;

  const owner = "test-owner";
  const repo = "test-repo";
  const since = new Date("2024-01-01T00:00:00Z");
  const until = new Date("2024-01-31T23:59:59Z");

  beforeEach(() => {
    mockClient = {
      getMergedPullRequests: vi.fn(),
      getCommits: vi.fn(),
      getIssuesWithLabel: vi.fn(),
      getPullRequestsWithLabels: vi.fn(),
    } as unknown as GitHubClient;

    collector = new MetricsCollector(mockClient);
  });

  describe("collectDeployments", () => {
    it("should convert merged PRs to deployments with lead time", async () => {
      vi.mocked(mockClient.getMergedPullRequests).mockResolvedValue([
        {
          id: 1,
          number: 10,
          title: "Feature PR",
          state: "closed",
          merged_at: "2024-01-15T12:00:00Z",
          created_at: "2024-01-15T10:00:00Z",
          labels: [],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
      ]);

      const result = await collector.collectDeployments(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.sha).toBe("def456");
      expect(result[0]?.leadTimeSeconds).toBe(7200); // 2 hours
    });

    it("should skip PRs without merge commit", async () => {
      vi.mocked(mockClient.getMergedPullRequests).mockResolvedValue([
        {
          id: 1,
          number: 10,
          title: "Not merged",
          state: "closed",
          merged_at: null,
          created_at: "2024-01-15T10:00:00Z",
          labels: [],
          head: { sha: "abc123" },
          merge_commit_sha: null,
        },
      ]);

      const result = await collector.collectDeployments(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("collectIncidents", () => {
    it("should collect issues with incident label", async () => {
      vi.mocked(mockClient.getIssuesWithLabel).mockResolvedValue([
        {
          id: 1,
          number: 5,
          title: "Service down",
          state: "closed",
          labels: [{ name: "incident" }],
          created_at: "2024-01-15T10:00:00Z",
          closed_at: "2024-01-15T12:00:00Z",
        },
      ]);

      const result = await collector.collectIncidents(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.issueNumber).toBe(5);
      expect(result[0]?.timeToRestoreSeconds).toBe(7200);
    });

    it("should handle unresolved incidents", async () => {
      vi.mocked(mockClient.getIssuesWithLabel).mockResolvedValue([
        {
          id: 1,
          number: 5,
          title: "Ongoing issue",
          state: "open",
          labels: [{ name: "incident" }],
          created_at: "2024-01-15T10:00:00Z",
          closed_at: null,
        },
      ]);

      const result = await collector.collectIncidents(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.resolvedAt).toBeNull();
      expect(result[0]?.timeToRestoreSeconds).toBeNull();
    });

    it("should deduplicate incidents from multiple labels", async () => {
      vi.mocked(mockClient.getIssuesWithLabel)
        .mockResolvedValueOnce([
          {
            id: 1,
            number: 5,
            title: "Incident",
            state: "closed",
            labels: [{ name: "incident" }],
            created_at: "2024-01-15T10:00:00Z",
            closed_at: "2024-01-15T12:00:00Z",
          },
        ])
        .mockResolvedValueOnce([
          // Same issue returned for different label query
          {
            id: 1,
            number: 5,
            title: "Incident",
            state: "closed",
            labels: [{ name: "incident" }],
            created_at: "2024-01-15T10:00:00Z",
            closed_at: "2024-01-15T12:00:00Z",
          },
        ]);

      const customCollector = new MetricsCollector(mockClient, {
        incidentLabels: ["incident", "production-issue"],
      });

      const result = await customCollector.collectIncidents(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
    });
  });

  describe("collectFailedChanges", () => {
    it("should detect revert commits", async () => {
      vi.mocked(mockClient.getCommits).mockResolvedValue([
        {
          sha: "abc123",
          commit: {
            message: "revert: undo bad change",
            author: { date: "2024-01-15T10:00:00Z" },
          },
        },
        {
          sha: "def456",
          commit: {
            message: "feat: normal commit",
            author: { date: "2024-01-16T10:00:00Z" },
          },
        },
      ]);

      vi.mocked(mockClient.getPullRequestsWithLabels).mockResolvedValue([]);

      const result = await collector.collectFailedChanges(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("revert_commit");
      expect(result[0]?.identifier).toBe("abc123");
    });

    it("should detect rollback commits", async () => {
      vi.mocked(mockClient.getCommits).mockResolvedValue([
        {
          sha: "abc123",
          commit: {
            message: "Rollback deployment",
            author: { date: "2024-01-15T10:00:00Z" },
          },
        },
      ]);

      vi.mocked(mockClient.getPullRequestsWithLabels).mockResolvedValue([]);

      const result = await collector.collectFailedChanges(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("revert_commit");
    });

    it("should detect hotfix PRs", async () => {
      vi.mocked(mockClient.getCommits).mockResolvedValue([]);
      vi.mocked(mockClient.getPullRequestsWithLabels).mockResolvedValue([
        {
          id: 1,
          number: 20,
          title: "Hotfix critical bug",
          state: "closed",
          merged_at: "2024-01-15T10:00:00Z",
          created_at: "2024-01-15T09:00:00Z",
          labels: [{ name: "hotfix" }],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
      ]);

      const result = await collector.collectFailedChanges(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("hotfix_pr");
      expect(result[0]?.identifier).toBe("PR#20");
    });

    it("should detect incident PRs", async () => {
      vi.mocked(mockClient.getCommits).mockResolvedValue([]);
      vi.mocked(mockClient.getPullRequestsWithLabels).mockResolvedValue([
        {
          id: 1,
          number: 21,
          title: "Fix incident",
          state: "closed",
          merged_at: "2024-01-15T10:00:00Z",
          created_at: "2024-01-15T09:00:00Z",
          labels: [{ name: "incident" }],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
      ]);

      const result = await collector.collectFailedChanges(
        owner,
        repo,
        since,
        until
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("incident_pr");
    });
  });

  describe("collectAll", () => {
    it("should collect all metrics data in parallel", async () => {
      vi.mocked(mockClient.getMergedPullRequests).mockResolvedValue([
        {
          id: 1,
          number: 10,
          title: "Feature",
          state: "closed",
          merged_at: "2024-01-15T12:00:00Z",
          created_at: "2024-01-15T10:00:00Z",
          labels: [],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
      ]);

      vi.mocked(mockClient.getIssuesWithLabel).mockResolvedValue([
        {
          id: 1,
          number: 5,
          title: "Incident",
          state: "closed",
          labels: [{ name: "incident" }],
          created_at: "2024-01-15T10:00:00Z",
          closed_at: "2024-01-15T11:00:00Z",
        },
      ]);

      vi.mocked(mockClient.getCommits).mockResolvedValue([]);
      vi.mocked(mockClient.getPullRequestsWithLabels).mockResolvedValue([]);

      const result = await collector.collectAll(owner, repo, since, until);

      expect(result.deployments).toHaveLength(1);
      expect(result.incidents).toHaveLength(1);
      expect(result.failedChanges).toHaveLength(0);
    });
  });
});
