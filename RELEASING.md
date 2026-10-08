# Releasing

Packages are published to npm from GitHub Actions (`.github/workflows/release.yml`)
when a `v<version>` tag is pushed. Versions follow upstream Lucide:
`@filled-lucide/react@1.52.0` has the icons of `lucide-react@1.52.0`.

| Package                       | Directory                      |
| ----------------------------- | ------------------------------ |
| `filled-lucide`               | `packages/lucide`              |
| `@filled-lucide/react`        | `packages/lucide-react`        |
| `@filled-lucide/react-native` | `packages/lucide-react-native` |
| `@filled-lucide/preact`       | `packages/lucide-preact`       |
| `@filled-lucide/solid`        | `packages/lucide-solid`        |
| `@filled-lucide/static`       | `packages/lucide-static`       |
| `@filled-lucide/vue`          | `packages/vue`                 |
| `@filled-lucide/svelte`       | `packages/svelte`              |
| `@filled-lucide/angular`      | `packages/angular`             |
| `@filled-lucide/astro`        | `packages/astro`               |
| `@filled-lucide/icons`        | `packages/icons`               |
| `@filled-lucide/lab`          | `packages/lab`                 |

Everything else in the workspace (`packages/shared`, `tools/*`, `docs`) is
private and never published.

## One-time setup

### 1. GitHub repository

npm provenance only works for public repositories.

```bash
gh repo edit linus-sch/filled-lucide --visibility public --accept-visibility-change-consequences
gh repo edit linus-sch/filled-lucide --homepage https://filledlucide.dev \
  --add-topic icons --add-topic lucide --add-topic svg --add-topic react --add-topic vue

# Let the upstream-sync workflow open pull requests
gh api -X PUT repos/linus-sch/filled-lucide/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
```

The workflows only run in `linus-sch/filled-lucide`. If the repo moves (for
example to a `filled-lucide` GitHub organization), update the
`github.repository ==` checks in `.github/workflows/*.yml` and the
`repository`/`bugs` URLs in `packages/*/package.json`.

### 2. First publish (bootstrap token)

A trusted publisher can only be configured for a package that already exists
on npm, so the very first release uses a short-lived token.

1. On npmjs.com: **Access Tokens → Generate New Token → Granular Access Token**
   - Expiration: 7 days
   - Packages and scopes: **Read and write**, **All packages** (the packages
     don't exist yet, so they can't be selected individually)
   - Check **Bypass two-factor authentication**
2. Add it to the repo and release:

   ```bash
   gh secret set NPM_TOKEN --repo linus-sch/filled-lucide   # paste the token
   git tag v1.52.0
   git push origin main v1.52.0
   ```

3. Watch the run: `gh run watch --repo linus-sch/filled-lucide`. If a single
   package fails, re-run just the failed jobs (`gh run rerun <id> --failed`) —
   packages that already published are unaffected.

### 3. Switch to trusted publishing

For **each of the 12 packages** on npmjs.com
(`https://www.npmjs.com/package/<name>/access`):

1. **Trusted Publisher → GitHub Actions**
   - Organization or user: `linus-sch`
   - Repository: `filled-lucide`
   - Workflow filename: `release.yml`
   - Environment: leave empty
2. **Publishing access → Require two-factor authentication and disallow
   tokens**, then save.

Then remove the bootstrap token:

```bash
gh secret delete NPM_TOKEN --repo linus-sch/filled-lucide
```

…and delete the token on npmjs.com. From now on releases authenticate with
OIDC and get provenance attestations, with no secrets stored anywhere.

## Releasing a new version

### When upstream Lucide releases

`.github/workflows/sync-upstream.yml` runs every Monday (or manually:
`gh workflow run sync-upstream.yml -f version=1.53.0`). When Lucide has a new
release it copies the outline icons into `outline/`, regenerates the filled
set, bumps the package versions and opens a PR `chore: sync with Lucide <version>`.

PRs opened by GitHub Actions don't trigger CI on their own; close and reopen the
PR (or push a commit to it) to run CI.

1. Check out the PR branch and review the new and changed icons:

   ```bash
   gh pr checkout <number>
   pnpm install
   pnpm fill:review
   ```

   Fix icons with overrides (see [CONTRIBUTING.md](CONTRIBUTING.md)), approve
   them, commit and push. The PR body lists approved icons whose outline
   changed upstream — they are kept as approved, so unapprove and redo any that
   need it.

2. Merge, then tag:

   ```bash
   git switch main && git pull
   git tag v1.53.0
   git push origin v1.53.0
   ```

The same sync can be run locally against a Lucide checkout:

```bash
node scripts/syncUpstream.mts --upstream ../lucide-upstream --version 1.53.0
pnpm fill && pnpm fill:lab
```

### Filled-only fixes

Icon fixes normally ship with the next upstream sync, which keeps version
numbers identical to Lucide's. If a fix can't wait, publish a prerelease of the
next patch under the `next` dist-tag. It sorts above the current version and
below upstream's next one, and installs only on request
(`pnpm add @filled-lucide/react@next`):

```bash
gh workflow run release.yml -f version=1.52.1-filled.1 -f tag=next
```

## Deploying the website / CDN

See [`deploy/README.md`](deploy/README.md) (`pnpm cdn:deploy`).
