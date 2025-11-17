import { describe, it, expect } from "vitest";
import { calculateFourKeysMetrics, compareMetrics } from "./calculator";
import {
  type DeploymentData,
  type FailedChangeData,
  type IncidentData,
} from "./types";

describe("calculateFourKeysMetrics", () => {
  const periodStart = new Date("2024-01-01T00:00:00Z");
  const periodEnd = new Date("2024-01-31T23:59:59Z");

  describe("Deployment Frequency", () => {
    it("should calculate elite rating for multiple deploys per day", () => {
      const deployments: DeploymentData[] = Array.from(
        { length: 62 },
        (_, i) => ({
          sha: `sha${i}`,
          deployedAt: new Date(
            periodStart.getTime() + i * 12 * 60 * 60 * 1000
          ),
          leadTimeSeconds: 3600,
        })
      );

      const result = calculateFourKeysMetrics(
        deployments,
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.deploymentFrequency.count).toBe(62);
      expect(result.deploymentFrequency.averagePerDay).toBeGreaterThan(1);
      expect(result.deploymentFrequency.rating).toBe("elite");
    });

    it("should calculate high rating for weekly deploys", () => {
      // 7 deploys in 31 days = 0.226/day, which is > 1/7 (0.143)
      const deployments: DeploymentData[] = Array.from(
        { length: 7 },
        (_, i) => ({
          sha: `sha${i}`,
          deployedAt: new Date(
            periodStart.getTime() + i * 4 * 24 * 60 * 60 * 1000
          ),
          leadTimeSeconds: 3600,
        })
      );

      const result = calculateFourKeysMetrics(
        deployments,
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.deploymentFrequency.rating).toBe("high");
    });

    it("should calculate medium rating for monthly deploys", () => {
      // 2 deploys in 31 days = 0.065/day, which is > 1/30 (0.033) but < 1/7 (0.143)
      const deployments: DeploymentData[] = [
        {
          sha: "sha1",
          deployedAt: new Date("2024-01-10T00:00:00Z"),
          leadTimeSeconds: 3600,
        },
        {
          sha: "sha2",
          deployedAt: new Date("2024-01-25T00:00:00Z"),
          leadTimeSeconds: 3600,
        },
      ];

      const result = calculateFourKeysMetrics(
        deployments,
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.deploymentFrequency.rating).toBe("medium");
    });

    it("should calculate low rating for no deploys", () => {
      const result = calculateFourKeysMetrics(
        [],
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.deploymentFrequency.count).toBe(0);
      expect(result.deploymentFrequency.averagePerDay).toBe(0);
      expect(result.deploymentFrequency.rating).toBe("low");
    });
  });

  describe("Lead Time for Changes", () => {
    it("should calculate elite rating for sub-hour lead times", () => {
      const deployments: DeploymentData[] = [
        {
          sha: "sha1",
          deployedAt: new Date("2024-01-15T00:00:00Z"),
          leadTimeSeconds: 1800, // 30 minutes
        },
        {
          sha: "sha2",
          deployedAt: new Date("2024-01-16T00:00:00Z"),
          leadTimeSeconds: 2400, // 40 minutes
        },
      ];

      const result = calculateFourKeysMetrics(
        deployments,
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.leadTimeForChanges.medianSeconds).toBe(2100);
      expect(result.leadTimeForChanges.rating).toBe("elite");
    });

    it("should calculate high rating for day-to-week lead times", () => {
      const deployments: DeploymentData[] = [
        {
          sha: "sha1",
          deployedAt: new Date("2024-01-15T00:00:00Z"),
          leadTimeSeconds: 86400, // 1 day
        },
        {
          sha: "sha2",
          deployedAt: new Date("2024-01-16T00:00:00Z"),
          leadTimeSeconds: 172800, // 2 days
        },
      ];

      const result = calculateFourKeysMetrics(
        deployments,
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.leadTimeForChanges.rating).toBe("high");
    });

    it("should calculate average correctly", () => {
      const deployments: DeploymentData[] = [
        {
          sha: "sha1",
          deployedAt: new Date("2024-01-15T00:00:00Z"),
          leadTimeSeconds: 100,
        },
        {
          sha: "sha2",
          deployedAt: new Date("2024-01-16T00:00:00Z"),
          leadTimeSeconds: 200,
        },
        {
          sha: "sha3",
          deployedAt: new Date("2024-01-17T00:00:00Z"),
          leadTimeSeconds: 300,
        },
      ];

      const result = calculateFourKeysMetrics(
        deployments,
        [],
        [],
        periodStart,
        periodEnd
      );

      expect(result.leadTimeForChanges.averageSeconds).toBe(200);
      expect(result.leadTimeForChanges.medianSeconds).toBe(200);
    });
  });

  describe("Change Failure Rate", () => {
    it("should calculate elite rating for 0-5% failure rate", () => {
      const deployments: DeploymentData[] = Array.from(
        { length: 100 },
        (_, i) => ({
          sha: `sha${i}`,
          deployedAt: new Date(periodStart.getTime() + i * 60 * 60 * 1000),
          leadTimeSeconds: 3600,
        })
      );

      const failedChanges: FailedChangeData[] = [
        {
          type: "hotfix_pr",
          detectedAt: new Date("2024-01-15T00:00:00Z"),
          identifier: "PR#1",
        },
      ];

      const result = calculateFourKeysMetrics(
        deployments,
        failedChanges,
        [],
        periodStart,
        periodEnd
      );

      expect(result.changeFailureRate.percentage).toBe(1);
      expect(result.changeFailureRate.rating).toBe("elite");
    });

    it("should calculate high rating for 5-10% failure rate", () => {
      const deployments: DeploymentData[] = Array.from(
        { length: 100 },
        (_, i) => ({
          sha: `sha${i}`,
          deployedAt: new Date(periodStart.getTime() + i * 60 * 60 * 1000),
          leadTimeSeconds: 3600,
        })
      );

      const failedChanges: FailedChangeData[] = Array.from(
        { length: 8 },
        (_, i) => ({
          type: "revert_commit" as const,
          detectedAt: new Date(periodStart.getTime() + i * 24 * 60 * 60 * 1000),
          identifier: `sha${i}`,
        })
      );

      const result = calculateFourKeysMetrics(
        deployments,
        failedChanges,
        [],
        periodStart,
        periodEnd
      );

      expect(result.changeFailureRate.percentage).toBe(8);
      expect(result.changeFailureRate.rating).toBe("high");
    });

    it("should calculate low rating for >15% failure rate", () => {
      const deployments: DeploymentData[] = Array.from(
        { length: 10 },
        (_, i) => ({
          sha: `sha${i}`,
          deployedAt: new Date(periodStart.getTime() + i * 60 * 60 * 1000),
          leadTimeSeconds: 3600,
        })
      );

      const failedChanges: FailedChangeData[] = Array.from(
        { length: 3 },
        (_, i) => ({
          type: "incident_pr" as const,
          detectedAt: new Date(periodStart.getTime() + i * 24 * 60 * 60 * 1000),
          identifier: `PR#${i}`,
        })
      );

      const result = calculateFourKeysMetrics(
        deployments,
        failedChanges,
        [],
        periodStart,
        periodEnd
      );

      expect(result.changeFailureRate.percentage).toBe(30);
      expect(result.changeFailureRate.rating).toBe("low");
    });
  });

  describe("Time to Restore Service", () => {
    it("should calculate elite rating for sub-hour restoration", () => {
      const incidents: IncidentData[] = [
        {
          issueNumber: 1,
          createdAt: new Date("2024-01-15T10:00:00Z"),
          resolvedAt: new Date("2024-01-15T10:30:00Z"),
          timeToRestoreSeconds: 1800,
        },
      ];

      const result = calculateFourKeysMetrics(
        [],
        [],
        incidents,
        periodStart,
        periodEnd
      );

      expect(result.timeToRestoreService.medianSeconds).toBe(1800);
      expect(result.timeToRestoreService.rating).toBe("elite");
    });

    it("should calculate high rating for sub-day restoration", () => {
      const incidents: IncidentData[] = [
        {
          issueNumber: 1,
          createdAt: new Date("2024-01-15T10:00:00Z"),
          resolvedAt: new Date("2024-01-15T18:00:00Z"),
          timeToRestoreSeconds: 28800, // 8 hours
        },
      ];

      const result = calculateFourKeysMetrics(
        [],
        [],
        incidents,
        periodStart,
        periodEnd
      );

      expect(result.timeToRestoreService.rating).toBe("high");
    });

    it("should ignore unresolved incidents in calculation", () => {
      const incidents: IncidentData[] = [
        {
          issueNumber: 1,
          createdAt: new Date("2024-01-15T10:00:00Z"),
          resolvedAt: null,
          timeToRestoreSeconds: null,
        },
        {
          issueNumber: 2,
          createdAt: new Date("2024-01-16T10:00:00Z"),
          resolvedAt: new Date("2024-01-16T11:00:00Z"),
          timeToRestoreSeconds: 3600,
        },
      ];

      const result = calculateFourKeysMetrics(
        [],
        [],
        incidents,
        periodStart,
        periodEnd
      );

      expect(result.timeToRestoreService.medianSeconds).toBe(3600);
    });
  });

  describe("Period calculation", () => {
    it("should calculate period days correctly", () => {
      const result = calculateFourKeysMetrics(
        [],
        [],
        [],
        periodStart,
        periodEnd
      );

      // January has ~31 days
      expect(result.period.days).toBeCloseTo(30.999, 2);
      expect(result.period.start).toEqual(periodStart);
      expect(result.period.end).toEqual(periodEnd);
    });
  });
});

describe("compareMetrics", () => {
  it("should calculate percentage changes correctly", () => {
    const current = calculateFourKeysMetrics(
      [
        {
          sha: "sha1",
          deployedAt: new Date("2024-02-01"),
          leadTimeSeconds: 3600,
        },
        {
          sha: "sha2",
          deployedAt: new Date("2024-02-15"),
          leadTimeSeconds: 3600,
        },
      ],
      [],
      [],
      new Date("2024-02-01"),
      new Date("2024-02-28")
    );

    const previous = calculateFourKeysMetrics(
      [
        {
          sha: "sha1",
          deployedAt: new Date("2024-01-15"),
          leadTimeSeconds: 7200,
        },
      ],
      [],
      [],
      new Date("2024-01-01"),
      new Date("2024-01-31")
    );

    const changes = compareMetrics(current, previous);

    // Deployment frequency increased
    expect(changes.deploymentFrequency).toBeGreaterThan(0);
    // Lead time decreased (improved)
    expect(changes.leadTimeForChanges).toBeLessThan(0);
  });

  it("should handle zero previous values", () => {
    const current = calculateFourKeysMetrics(
      [
        {
          sha: "sha1",
          deployedAt: new Date("2024-02-01"),
          leadTimeSeconds: 3600,
        },
      ],
      [],
      [],
      new Date("2024-02-01"),
      new Date("2024-02-28")
    );

    const previous = calculateFourKeysMetrics(
      [],
      [],
      [],
      new Date("2024-01-01"),
      new Date("2024-01-31")
    );

    const changes = compareMetrics(current, previous);

    expect(changes.deploymentFrequency).toBe(100);
    expect(changes.changeFailureRate).toBe(0);
  });
});
