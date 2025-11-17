"use client";

export const runtime = "edge";

import { useState } from "react";
import { api } from "~/trpc/react";
import { TokenInput } from "~/components/TokenInput";
import { RepositorySelector } from "~/components/RepositorySelector";
import { PeriodSelector } from "~/components/PeriodSelector";
import { MetricsDashboard } from "~/components/MetricsDashboard";

interface Repository {
  fullName: string;
  owner: string;
  name: string;
}

export default function Home() {
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Repository[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0] ?? "";
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0] ?? "";
  });
  const [comparePrevious, setComparePrevious] = useState(false);

  const validateToken = api.metrics.validateToken.useQuery(
    { token },
    {
      enabled: false,
      retry: false,
    }
  );

  const listRepos = api.metrics.listUserRepositories.useQuery(
    { token },
    {
      enabled: isAuthenticated,
    }
  );

  const getMetrics = api.metrics.getMetrics.useQuery(
    {
      token,
      repositories: selectedRepos.map((r) => ({
        owner: r.owner,
        name: r.name,
      })),
      period: {
        start: new Date(startDate).toISOString(),
        end: new Date(endDate + "T23:59:59Z").toISOString(),
      },
      comparePrevious,
    },
    {
      enabled: isAuthenticated && selectedRepos.length > 0,
    }
  );

  const handleTokenSubmit = async (submittedToken: string) => {
    setToken(submittedToken);
    try {
      const result = await validateToken.refetch();
      if (result.data?.valid) {
        setIsAuthenticated(true);
      }
    } catch {
      // Error is handled by the query
    }
  };

  const handleDisconnect = () => {
    setToken("");
    setIsAuthenticated(false);
    setSelectedRepos([]);
  };

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Four Keys <span className="text-[hsl(280,100%,70%)]">Dashboard</span>
          </h1>
          <p className="text-xl text-white/80">
            Monitor your DevOps performance metrics
          </p>
          <TokenInput
            onTokenSubmit={handleTokenSubmit}
            isValidating={validateToken.isFetching}
            error={
              validateToken.error?.message ??
              (validateToken.isError ? "Failed to validate token" : undefined)
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Four Keys <span className="text-[hsl(280,100%,70%)]">Dashboard</span>
          </h1>
          <button
            onClick={handleDisconnect}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white transition hover:bg-gray-600"
          >
            Disconnect
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <h2 className="mb-4 text-lg font-semibold">Configuration</h2>

              <RepositorySelector
                repositories={listRepos.data ?? []}
                selectedRepositories={selectedRepos}
                onSelectionChange={setSelectedRepos}
                isLoading={listRepos.isLoading}
              />

              <div className="mt-6">
                <PeriodSelector
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  comparePrevious={comparePrevious}
                  onComparePreviousChange={setComparePrevious}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedRepos.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50">
                <p className="text-gray-400">
                  Select at least one repository to view metrics
                </p>
              </div>
            ) : getMetrics.isLoading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="text-center">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                  <p className="text-gray-400">Loading metrics...</p>
                </div>
              </div>
            ) : getMetrics.error ? (
              <div className="rounded-lg border border-red-700 bg-red-900/30 p-6">
                <h3 className="text-lg font-semibold text-red-400">Error</h3>
                <p className="mt-2 text-red-300">
                  {getMetrics.error.message}
                </p>
              </div>
            ) : getMetrics.data ? (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-4 text-2xl font-bold">Aggregate Metrics</h2>
                  <MetricsDashboard
                    metrics={getMetrics.data.aggregate}
                    comparison={getMetrics.data.comparison?.changes}
                  />
                </div>

                {getMetrics.data.byRepository.length > 1 && (
                  <div>
                    <h2 className="mb-4 text-2xl font-bold">By Repository</h2>
                    <div className="space-y-6">
                      {getMetrics.data.byRepository.map((repoData) => (
                        <div key={repoData.repository}>
                          <h3 className="mb-3 text-lg font-semibold text-purple-400">
                            {repoData.repository}
                          </h3>
                          <MetricsDashboard metrics={repoData.metrics} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
