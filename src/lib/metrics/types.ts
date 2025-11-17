export interface DeploymentData {
  sha: string;
  deployedAt: Date;
  leadTimeSeconds: number;
}

export interface IncidentData {
  issueNumber: number;
  createdAt: Date;
  resolvedAt: Date | null;
  timeToRestoreSeconds: number | null;
}

export interface FailedChangeData {
  type: "revert_commit" | "hotfix_pr" | "incident_pr";
  detectedAt: Date;
  identifier: string; // SHA or PR number
}

export interface FourKeysMetrics {
  deploymentFrequency: {
    count: number;
    averagePerDay: number;
    rating: "elite" | "high" | "medium" | "low";
  };
  leadTimeForChanges: {
    averageSeconds: number;
    medianSeconds: number;
    rating: "elite" | "high" | "medium" | "low";
  };
  changeFailureRate: {
    percentage: number;
    failedCount: number;
    totalCount: number;
    rating: "elite" | "high" | "medium" | "low";
  };
  timeToRestoreService: {
    averageSeconds: number;
    medianSeconds: number;
    rating: "elite" | "high" | "medium" | "low";
  };
  period: {
    start: Date;
    end: Date;
    days: number;
  };
}

export interface MetricsComparison {
  current: FourKeysMetrics;
  previous: FourKeysMetrics;
  changes: {
    deploymentFrequency: number; // percentage change
    leadTimeForChanges: number;
    changeFailureRate: number;
    timeToRestoreService: number;
  };
}
