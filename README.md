# portfolio

My portfolio at <https://lhckb.github.io/portfolio/>: a static Astro site that lists my public GitHub repos in two sections, Software Engineering and Data. Projects come from the GitHub API at build time.

## Adding, moving or hiding a project

Give the repo one of these topics on GitHub; remove it to hide the project.

| Topic | Section | Row tag |
| --- | --- | --- |
| `portfolio-software` | Software Engineering | the repo's first other topic, if any |
| `portfolio-data-science` | Data | `ds` |
| `portfolio-data-engineering` | Data | `de` |

```sh
gh repo edit lhckb/<repo> --add-topic portfolio-software
gh workflow run deploy.yml   # or wait for the daily build at 06:00 UTC
```

The repo's About description, language, homepage (shown as a `demo` link) and last push date are shown. Rows are sorted newest push first.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at <http://localhost:4321/portfolio/> |
| `npm run build` | Build to `dist/` (fails if the GitHub API call fails) |
| `npm run preview` | Serve the build locally |
| `npm test` | Vitest tests for the repo classification rules |
| `npm run check` | Type-check Astro and TypeScript files |
| `npm run repos` | List every public repo and its portfolio section (`-` if untagged) |

API calls use `GITHUB_TOKEN` when set, otherwise your `gh` login, otherwise go unauthenticated (60 requests an hour is enough). `REPOS_FILE=path/to/repos.json npm run build` builds from a saved API response instead, which is handy for previewing a tagging plan.

## Configuration

All personal content, the topic names and the GoatCounter code live in [`site.config.ts`](site.config.ts). The GoatCounter script is added only to builds in GitHub Actions (or with `FORCE_ANALYTICS=true`), and only when `goatcounterCode` is set.

## Deploy

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) tests, builds and deploys to GitHub Pages on every push to `main`, daily at 06:00 UTC and on manual runs. Pages must be set to deploy from GitHub Actions (Settings → Pages → Source).

GitHub pauses scheduled workflows after 60 days without repo activity. If the site stops refreshing, re-enable the workflow in the Actions tab or push a commit.
