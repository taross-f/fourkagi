"use client";

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  comparePrevious: boolean;
  onComparePreviousChange: (compare: boolean) => void;
}

export function PeriodSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  comparePrevious,
  onComparePreviousChange,
}: PeriodSelectorProps) {
  const presetPeriods = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    onStartDateChange(start.toISOString().split("T")[0] ?? "");
    onEndDateChange(end.toISOString().split("T")[0] ?? "");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">
          Quick Select
        </label>
        <div className="mt-1 flex gap-2">
          {presetPeriods.map((preset) => (
            <button
              key={preset.days}
              onClick={() => applyPreset(preset.days)}
              className="rounded-md bg-gray-700 px-3 py-1 text-sm text-white transition hover:bg-gray-600"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium text-gray-300"
          >
            Start Date
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div>
          <label
            htmlFor="end-date"
            className="block text-sm font-medium text-gray-300"
          >
            End Date
          </label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={comparePrevious}
          onChange={(e) => onComparePreviousChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
        />
        <span className="ml-2 text-sm text-gray-300">
          Compare with previous period
        </span>
      </label>
    </div>
  );
}
