"use client";

import { useState } from "react";

interface TokenInputProps {
  onTokenSubmit: (token: string) => void;
  isValidating: boolean;
  error?: string;
}

export function TokenInput({
  onTokenSubmit,
  isValidating,
  error,
}: TokenInputProps) {
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onTokenSubmit(token.trim());
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-300"
          >
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="ghp_xxxxxxxxxxxx"
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            Token needs read access to repositories, pull requests, and issues
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isValidating || !token.trim()}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isValidating ? "Validating..." : "Connect to GitHub"}
        </button>
      </form>
    </div>
  );
}
