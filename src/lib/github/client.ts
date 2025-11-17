import {
  type GitHubRepository,
  type GitHubPullRequest,
  type GitHubCommit,
  type GitHubIssue,
  type FetchOptions,
} from "./types";

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

export class GitHubClient {
  private baseUrl = "https://api.github.com";
  private token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error("GitHub token is required");
    }
    this.token = token;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "FourKagi-Dashboard",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new GitHubAPIError(
        `GitHub API error: ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return response.json() as Promise<T>;
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.fetch<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  async getMergedPullRequests(
    options: FetchOptions
  ): Promise<GitHubPullRequest[]> {
    const { owner, repo, since, until } = options;
    const params = new URLSearchParams({
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: "100",
    });

    const allPRs: GitHubPullRequest[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      params.set("page", page.toString());
      const prs = await this.fetch<GitHubPullRequest[]>(
        `/repos/${owner}/${repo}/pulls?${params.toString()}`
      );

      const filteredPRs = prs.filter((pr) => {
        if (!pr.merged_at) return false;
        const mergedDate = new Date(pr.merged_at);
        if (since && mergedDate < since) return false;
        if (until && mergedDate > until) return false;
        return true;
      });

      allPRs.push(...filteredPRs);

      // Stop if we've gone past the since date or no more results
      if (
        prs.length < 100 ||
        (since && prs.some((pr) => new Date(pr.created_at) < since))
      ) {
        hasMore = false;
      }
      page++;

      // Safety limit
      if (page > 10) hasMore = false;
    }

    return allPRs;
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
    return this.fetch<GitHubCommit>(`/repos/${owner}/${repo}/commits/${sha}`);
  }

  async getCommits(options: FetchOptions): Promise<GitHubCommit[]> {
    const { owner, repo, since, until } = options;
    const params = new URLSearchParams({
      per_page: "100",
    });

    if (since) {
      params.set("since", since.toISOString());
    }
    if (until) {
      params.set("until", until.toISOString());
    }

    const allCommits: GitHubCommit[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      params.set("page", page.toString());
      const commits = await this.fetch<GitHubCommit[]>(
        `/repos/${owner}/${repo}/commits?${params.toString()}`
      );

      allCommits.push(...commits);

      if (commits.length < 100) {
        hasMore = false;
      }
      page++;

      if (page > 10) hasMore = false;
    }

    return allCommits;
  }

  async getIssuesWithLabel(
    options: FetchOptions & { label: string }
  ): Promise<GitHubIssue[]> {
    const { owner, repo, since, until, label } = options;
    const params = new URLSearchParams({
      state: "all",
      labels: label,
      sort: "created",
      direction: "desc",
      per_page: "100",
    });

    if (since) {
      params.set("since", since.toISOString());
    }

    const allIssues: GitHubIssue[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      params.set("page", page.toString());
      const issues = await this.fetch<GitHubIssue[]>(
        `/repos/${owner}/${repo}/issues?${params.toString()}`
      );

      const filteredIssues = issues.filter((issue) => {
        const createdDate = new Date(issue.created_at);
        if (since && createdDate < since) return false;
        if (until && createdDate > until) return false;
        return true;
      });

      allIssues.push(...filteredIssues);

      if (issues.length < 100) {
        hasMore = false;
      }
      page++;

      if (page > 10) hasMore = false;
    }

    return allIssues;
  }

  async getPullRequestsWithLabels(
    options: FetchOptions & { labels: string[] }
  ): Promise<GitHubPullRequest[]> {
    const prs = await this.getMergedPullRequests(options);
    return prs.filter((pr) =>
      pr.labels.some((label) => options.labels.includes(label.name))
    );
  }
}
