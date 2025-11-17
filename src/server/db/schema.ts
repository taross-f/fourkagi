import { sql } from "drizzle-orm";
import { index, int, sqliteTableCreator, text } from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator((name) => `fourkagi_${name}`);

export const repositories = createTable(
  "repository",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    owner: text("owner", { length: 256 }).notNull(),
    name: text("name", { length: 256 }).notNull(),
    fullName: text("full_name", { length: 512 }).notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: int("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  },
  (repository) => ({
    fullNameIdx: index("full_name_idx").on(repository.fullName),
  })
);

export const deployments = createTable(
  "deployment",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    repositoryId: int("repository_id", { mode: "number" })
      .notNull()
      .references(() => repositories.id),
    sha: text("sha", { length: 40 }).notNull(),
    deployedAt: int("deployed_at", { mode: "timestamp" }).notNull(),
    leadTimeSeconds: int("lead_time_seconds", { mode: "number" }).notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (deployment) => ({
    repoIdIdx: index("deployment_repo_id_idx").on(deployment.repositoryId),
    deployedAtIdx: index("deployment_deployed_at_idx").on(
      deployment.deployedAt
    ),
  })
);

export const incidents = createTable(
  "incident",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    repositoryId: int("repository_id", { mode: "number" })
      .notNull()
      .references(() => repositories.id),
    issueNumber: int("issue_number", { mode: "number" }).notNull(),
    title: text("title", { length: 512 }).notNull(),
    createdAt: int("created_at", { mode: "timestamp" }).notNull(),
    resolvedAt: int("resolved_at", { mode: "timestamp" }),
    timeToRestoreSeconds: int("time_to_restore_seconds", { mode: "number" }),
  },
  (incident) => ({
    repoIdIdx: index("incident_repo_id_idx").on(incident.repositoryId),
    createdAtIdx: index("incident_created_at_idx").on(incident.createdAt),
  })
);

export const failedChanges = createTable(
  "failed_change",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    repositoryId: int("repository_id", { mode: "number" })
      .notNull()
      .references(() => repositories.id),
    prNumber: int("pr_number", { mode: "number" }),
    sha: text("sha", { length: 40 }),
    failureType: text("failure_type", { length: 50 }).notNull(), // 'revert_commit', 'hotfix_pr', 'incident_pr'
    detectedAt: int("detected_at", { mode: "timestamp" }).notNull(),
    createdAt: int("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (failedChange) => ({
    repoIdIdx: index("failed_change_repo_id_idx").on(failedChange.repositoryId),
    detectedAtIdx: index("failed_change_detected_at_idx").on(
      failedChange.detectedAt
    ),
  })
);
