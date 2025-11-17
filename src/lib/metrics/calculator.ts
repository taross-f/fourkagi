import {
  type DeploymentData,
  type IncidentData,
  type FailedChangeData,
  type FourKeysMetrics,
} from "./types";

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_WEEK = 604800;
const SECONDS_PER_MONTH = 2592000; // 30 days
const SECONDS_PER_SIX_MONTHS = 15552000; // 180 days

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function rateDeploymentFrequency(
  averagePerDay: number
): "elite" | "high" | "medium" | "low" {
  // Elite: Multiple deploys per day (>1)
  // High: Between once per day and once per week (1/7 to 1)
  // Medium: Between once per week and once per month (1/30 to 1/7)
  // Low: Less than once per month (<1/30)
  if (averagePerDay >= 1) return "elite";
  if (averagePerDay >= 1 / 7) return "high";
  if (averagePerDay >= 1 / 30) return "medium";
  return "low";
}

function rateLeadTime(
  medianSeconds: number
): "elite" | "high" | "medium" | "low" {
  // Elite: Less than one hour
  // High: Between one day and one week
  // Medium: Between one week and one month
  // Low: More than one month
  if (medianSeconds < SECONDS_PER_HOUR) return "elite";
  if (medianSeconds < SECONDS_PER_WEEK) return "high";
  if (medianSeconds < SECONDS_PER_MONTH) return "medium";
  return "low";
}

function rateChangeFailureRate(
  percentage: number
): "elite" | "high" | "medium" | "low" {
  // Elite: 0-5%
  // High: 5-10%
  // Medium: 10-15%
  // Low: More than 15%
  if (percentage <= 5) return "elite";
  if (percentage <= 10) return "high";
  if (percentage <= 15) return "medium";
  return "low";
}

function rateTimeToRestore(
  medianSeconds: number
): "elite" | "high" | "medium" | "low" {
  // Elite: Less than one hour
  // High: Less than one day
  // Medium: Less than one week
  // Low: More than one week
  if (medianSeconds < SECONDS_PER_HOUR) return "elite";
  if (medianSeconds < SECONDS_PER_DAY) return "high";
  if (medianSeconds < SECONDS_PER_WEEK) return "medium";
  return "low";
}

export function calculateFourKeysMetrics(
  deployments: DeploymentData[],
  failedChanges: FailedChangeData[],
  incidents: IncidentData[],
  periodStart: Date,
  periodEnd: Date
): FourKeysMetrics {
  const periodDays =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * SECONDS_PER_DAY);

  // Deployment Frequency
  const deploymentCount = deployments.length;
  const averagePerDay = periodDays > 0 ? deploymentCount / periodDays : 0;

  // Lead Time for Changes
  const leadTimes = deployments.map((d) => d.leadTimeSeconds);
  const avgLeadTime = average(leadTimes);
  const medianLeadTime = median(leadTimes);

  // Change Failure Rate
  const failedCount = failedChanges.length;
  const totalCount = deploymentCount;
  const failurePercentage =
    totalCount > 0 ? (failedCount / totalCount) * 100 : 0;

  // Time to Restore Service
  const restoreTimes = incidents
    .filter((i) => i.timeToRestoreSeconds !== null)
    .map((i) => i.timeToRestoreSeconds as number);
  const avgRestoreTime = average(restoreTimes);
  const medianRestoreTime = median(restoreTimes);

  return {
    deploymentFrequency: {
      count: deploymentCount,
      averagePerDay,
      rating: rateDeploymentFrequency(averagePerDay),
    },
    leadTimeForChanges: {
      averageSeconds: avgLeadTime,
      medianSeconds: medianLeadTime,
      rating: rateLeadTime(medianLeadTime),
    },
    changeFailureRate: {
      percentage: failurePercentage,
      failedCount,
      totalCount,
      rating: rateChangeFailureRate(failurePercentage),
    },
    timeToRestoreService: {
      averageSeconds: avgRestoreTime,
      medianSeconds: medianRestoreTime,
      rating: rateTimeToRestore(medianRestoreTime),
    },
    period: {
      start: periodStart,
      end: periodEnd,
      days: periodDays,
    },
  };
}

export function compareMetrics(
  current: FourKeysMetrics,
  previous: FourKeysMetrics
): {
  deploymentFrequency: number;
  leadTimeForChanges: number;
  changeFailureRate: number;
  timeToRestoreService: number;
} {
  const percentageChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  return {
    deploymentFrequency: percentageChange(
      current.deploymentFrequency.averagePerDay,
      previous.deploymentFrequency.averagePerDay
    ),
    leadTimeForChanges: percentageChange(
      current.leadTimeForChanges.medianSeconds,
      previous.leadTimeForChanges.medianSeconds
    ),
    changeFailureRate: percentageChange(
      current.changeFailureRate.percentage,
      previous.changeFailureRate.percentage
    ),
    timeToRestoreService: percentageChange(
      current.timeToRestoreService.medianSeconds,
      previous.timeToRestoreService.medianSeconds
    ),
  };
}
