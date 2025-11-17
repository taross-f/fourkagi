import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubClient, GitHubAPIError } from "./client";

describe("GitHubClient", () => {
  const mockToken = "test-token";
  let client: GitHubClient;

  beforeEach(() => {
    client = new GitHubClient(mockToken);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("constructor", () => {
    it("should throw error if token is empty", () => {
      expect(() => new GitHubClient("")).toThrow("GitHub token is required");
    });

    it("should create client with valid token", () => {
      const client = new GitHubClient("valid-token");
      expect(client).toBeInstanceOf(GitHubClient);
    });
  });

  describe("getRepository", () => {
    it("should fetch repository data", async () => {
      const mockRepo = {
        id: 1,
        name: "test-repo",
        full_name: "owner/test-repo",
        owner: { login: "owner" },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepo),
      } as Response);

      const result = await client.getRepository("owner", "test-repo");
      expect(result).toEqual(mockRepo);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/owner/test-repo",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it("should throw GitHubAPIError on API failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve("Repository not found"),
      } as Response);

      await expect(
        client.getRepository("owner", "nonexistent")
      ).rejects.toThrow(GitHubAPIError);
    });
  });

  describe("getMergedPullRequests", () => {
    it("should fetch merged PRs within date range", async () => {
      const mockPRs = [
        {
          id: 1,
          number: 10,
          title: "Test PR",
          state: "closed",
          merged_at: "2024-01-15T10:00:00Z",
          created_at: "2024-01-14T10:00:00Z",
          labels: [],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRs),
      } as Response);

      const result = await client.getMergedPullRequests({
        owner: "owner",
        repo: "repo",
        since: new Date("2024-01-01"),
        until: new Date("2024-01-31"),
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.number).toBe(10);
    });

    it("should filter out unmerged PRs", async () => {
      const mockPRs = [
        {
          id: 1,
          number: 10,
          title: "Merged PR",
          state: "closed",
          merged_at: "2024-01-15T10:00:00Z",
          created_at: "2024-01-14T10:00:00Z",
          labels: [],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
        {
          id: 2,
          number: 11,
          title: "Closed but not merged",
          state: "closed",
          merged_at: null,
          created_at: "2024-01-14T10:00:00Z",
          labels: [],
          head: { sha: "ghi789" },
          merge_commit_sha: null,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRs),
      } as Response);

      const result = await client.getMergedPullRequests({
        owner: "owner",
        repo: "repo",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.number).toBe(10);
    });
  });

  describe("getCommit", () => {
    it("should fetch single commit", async () => {
      const mockCommit = {
        sha: "abc123",
        commit: {
          message: "Test commit",
          author: { date: "2024-01-15T10:00:00Z" },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCommit),
      } as Response);

      const result = await client.getCommit("owner", "repo", "abc123");
      expect(result.sha).toBe("abc123");
    });
  });

  describe("getCommits", () => {
    it("should fetch commits with date range", async () => {
      const mockCommits = [
        {
          sha: "abc123",
          commit: {
            message: "feat: add feature",
            author: { date: "2024-01-15T10:00:00Z" },
          },
        },
        {
          sha: "def456",
          commit: {
            message: "revert: undo changes",
            author: { date: "2024-01-16T10:00:00Z" },
          },
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCommits),
      } as Response);

      const result = await client.getCommits({
        owner: "owner",
        repo: "repo",
        since: new Date("2024-01-01"),
        until: new Date("2024-01-31"),
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("getIssuesWithLabel", () => {
    it("should fetch issues with specific label", async () => {
      const mockIssues = [
        {
          id: 1,
          number: 5,
          title: "Incident: service down",
          state: "closed",
          labels: [{ name: "incident" }],
          created_at: "2024-01-15T10:00:00Z",
          closed_at: "2024-01-15T12:00:00Z",
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      } as Response);

      const result = await client.getIssuesWithLabel({
        owner: "owner",
        repo: "repo",
        label: "incident",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.number).toBe(5);
    });
  });

  describe("getPullRequestsWithLabels", () => {
    it("should filter PRs by labels", async () => {
      const mockPRs = [
        {
          id: 1,
          number: 10,
          title: "Hotfix",
          state: "closed",
          merged_at: "2024-01-15T10:00:00Z",
          created_at: "2024-01-14T10:00:00Z",
          labels: [{ name: "hotfix" }],
          head: { sha: "abc123" },
          merge_commit_sha: "def456",
        },
        {
          id: 2,
          number: 11,
          title: "Regular PR",
          state: "closed",
          merged_at: "2024-01-15T11:00:00Z",
          created_at: "2024-01-14T11:00:00Z",
          labels: [{ name: "feature" }],
          head: { sha: "ghi789" },
          merge_commit_sha: "jkl012",
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPRs),
      } as Response);

      const result = await client.getPullRequestsWithLabels({
        owner: "owner",
        repo: "repo",
        labels: ["hotfix", "incident"],
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.number).toBe(10);
    });
  });
});
