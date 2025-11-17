"use client";

interface MetricsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  rating: "elite" | "high" | "medium" | "low";
  change?: number;
  invertChange?: boolean; // true if negative change is good (e.g., lead time)
}

const ratingColors = {
  elite: "text-green-400",
  high: "text-blue-400",
  medium: "text-yellow-400",
  low: "text-red-400",
};

const ratingBgColors = {
  elite: "bg-green-900/30",
  high: "bg-blue-900/30",
  medium: "bg-yellow-900/30",
  low: "bg-red-900/30",
};

export function MetricsCard({
  title,
  value,
  subtitle,
  rating,
  change,
  invertChange = false,
}: MetricsCardProps) {
  const changeColor =
    change !== undefined
      ? (invertChange ? change < 0 : change > 0)
        ? "text-green-400"
        : change === 0
          ? "text-gray-400"
          : "text-red-400"
      : "";

  const changePrefix =
    change !== undefined
      ? change > 0
        ? "+"
        : change < 0
          ? ""
          : ""
      : "";

  return (
    <div
      className={`rounded-lg border border-gray-700 p-6 ${ratingBgColors[rating]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${ratingColors[rating]}`}
        >
          {rating}
        </span>
      </div>

      {change !== undefined && (
        <div className={`mt-4 text-sm ${changeColor}`}>
          {changePrefix}
          {change.toFixed(1)}% from previous period
        </div>
      )}
    </div>
  );
}
