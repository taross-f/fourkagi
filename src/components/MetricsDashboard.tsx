"use client";

import { type FourKeysMetrics } from "~/lib/metrics";
import { MetricsCard } from "./MetricsCard";

interface MetricsDashboardProps {
  metrics: FourKeysMetrics;
  comparison?: {
    deploymentFrequency: number;
    leadTimeForChanges: number;
    changeFailureRate: number;
    timeToRestoreService: number;
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)}h`;
  }
  return `${(seconds / 86400).toFixed(1)}d`;
}

export function MetricsDashboard({
  metrics,
  comparison,
}: MetricsDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Deployment Frequency"
          value={metrics.deploymentFrequency.count.toString()}
          subtitle={`${metrics.deploymentFrequency.averagePerDay.toFixed(2)} per day`}
          rating={metrics.deploymentFrequency.rating}
          change={comparison?.deploymentFrequency}
        />

        <MetricsCard
          title="Lead Time for Changes"
          value={formatDuration(metrics.leadTimeForChanges.medianSeconds)}
          subtitle={`Avg: ${formatDuration(metrics.leadTimeForChanges.averageSeconds)}`}
          rating={metrics.leadTimeForChanges.rating}
          change={comparison?.leadTimeForChanges}
          invertChange={true}
        />

        <MetricsCard
          title="Change Failure Rate"
          value={`${metrics.changeFailureRate.percentage.toFixed(1)}%`}
          subtitle={`${metrics.changeFailureRate.failedCount} of ${metrics.changeFailureRate.totalCount} deployments`}
          rating={metrics.changeFailureRate.rating}
          change={comparison?.changeFailureRate}
          invertChange={true}
        />

        <MetricsCard
          title="Time to Restore Service"
          value={formatDuration(metrics.timeToRestoreService.medianSeconds)}
          subtitle={`Avg: ${formatDuration(metrics.timeToRestoreService.averageSeconds)}`}
          rating={metrics.timeToRestoreService.rating}
          change={comparison?.timeToRestoreService}
          invertChange={true}
        />
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="text-sm font-medium text-gray-400">Period</h3>
        <p className="mt-1 text-white">
          {metrics.period.start.toLocaleDateString()} -{" "}
          {metrics.period.end.toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-400">
          {metrics.period.days.toFixed(0)} days
        </p>
      </div>
    </div>
  );
}
