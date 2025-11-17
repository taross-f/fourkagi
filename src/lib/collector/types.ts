export interface CollectorConfig {
  incidentLabels: string[];
  hotfixLabels: string[];
  revertPatterns: RegExp[];
}

export const defaultCollectorConfig: CollectorConfig = {
  incidentLabels: ["incident"],
  hotfixLabels: ["hotfix", "incident"],
  revertPatterns: [/^revert/i, /^rollback/i],
};
