"use client";

import { useState } from "react";

interface Repository {
  fullName: string;
  owner: string;
  name: string;
}

interface RepositorySelectorProps {
  repositories: Repository[];
  selectedRepositories: Repository[];
  onSelectionChange: (repos: Repository[]) => void;
  isLoading: boolean;
}

export function RepositorySelector({
  repositories,
  selectedRepositories,
  onSelectionChange,
  isLoading,
}: RepositorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRepos = repositories.filter((repo) =>
    repo.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (repo: Repository) =>
    selectedRepositories.some((r) => r.fullName === repo.fullName);

  const toggleRepository = (repo: Repository) => {
    if (isSelected(repo)) {
      onSelectionChange(
        selectedRepositories.filter((r) => r.fullName !== repo.fullName)
      );
    } else {
      onSelectionChange([...selectedRepositories, repo]);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-10 rounded bg-gray-700"></div>
        <div className="h-40 rounded bg-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-300">
          Select Repositories ({selectedRepositories.length} selected)
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="Search repositories..."
        />
      </div>

      <div className="max-h-60 overflow-y-auto rounded-md border border-gray-600 bg-gray-800">
        {filteredRepos.length === 0 ? (
          <p className="p-3 text-sm text-gray-400">No repositories found</p>
        ) : (
          filteredRepos.map((repo) => (
            <label
              key={repo.fullName}
              className="flex cursor-pointer items-center border-b border-gray-700 p-3 last:border-b-0 hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={isSelected(repo)}
                onChange={() => toggleRepository(repo)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-3 text-sm text-white">{repo.fullName}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
