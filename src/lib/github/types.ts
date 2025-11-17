export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  created_at: string;
  labels: Array<{ name: string }>;
  head: {
    sha: string;
  };
  merge_commit_sha: string | null;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string }>;
  created_at: string;
  closed_at: string | null;
}

export interface FetchOptions {
  owner: string;
  repo: string;
  since?: Date;
  until?: Date;
}
