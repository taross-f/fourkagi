# Four Keys Dashboard

A dashboard for monitoring DevOps performance using the Four Keys metrics defined by DORA (DevOps Research and Assessment).

## Features

- **Deployment Frequency**: Track how often you deploy to production
- **Lead Time for Changes**: Measure time from code commit to production
- **Change Failure Rate**: Monitor the percentage of deployments causing failures
- **Time to Restore Service**: Track how quickly you recover from incidents

### Additional Features

- Multi-repository support
- Configurable time periods with presets (7, 30, 90 days)
- Period-over-period comparison
- Per-repository breakdown
- DORA performance ratings (Elite, High, Medium, Low)
- Real-time data from GitHub via Personal Access Token

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **API**: tRPC for type-safe endpoints
- **Database**: Drizzle ORM with Cloudflare D1
- **Cache**: Cloudflare Workers KV
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Deployment**: Cloudflare Pages/Workers

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- GitHub Personal Access Token (PAT) with `repo` scope

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test

# Type checking
npm run typecheck
```

### Building

```bash
npm run build
```

## Configuration

### GitHub Token Requirements

Your GitHub PAT needs the following permissions:
- `repo`: Full control of private repositories
  - Required for reading PRs, commits, and issues

### Metrics Detection

**Change Failure Rate** is calculated from:
- Commits with messages starting with "revert" or "rollback"
- PRs with labels: `hotfix` or `incident`

**Time to Restore Service** is calculated from:
- Issues with label: `incident`
- Time from issue creation to closure

### Customizing Labels

You can customize the labels used for detection by modifying the collector configuration in `src/lib/collector/types.ts`.

## Deployment to Cloudflare

### Prerequisites

1. Cloudflare account
2. Wrangler CLI installed

### Setup

1. Update `wrangler.toml` with your D1 database ID and KV namespace ID
2. Create D1 database:
   ```bash
   wrangler d1 create fourkagi-db
   ```
3. Create KV namespace:
   ```bash
   wrangler kv:namespace create CACHE
   ```
4. Run migrations:
   ```bash
   npm run db:generate
   wrangler d1 execute fourkagi-db --local --file=./drizzle/*.sql
   ```
5. Deploy:
   ```bash
   npm run pages:deploy
   ```

## Architecture

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React UI components
├── lib/
│   ├── github/            # GitHub API client
│   ├── collector/         # Data collection from GitHub
│   └── metrics/           # Four Keys calculation logic
├── server/
│   ├── api/               # tRPC API routes
│   └── db/                # Database schema
└── trpc/                  # tRPC client configuration
```

## Security

- GitHub tokens are never stored server-side
- Tokens are transmitted only via HTTPS
- No persistent storage of sensitive data
- All API calls are authenticated

## License

MIT
