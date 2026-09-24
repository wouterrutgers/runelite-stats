# RuneLite Hub Stats

A community dashboard for RuneLite Plugin Hub install counts, growth rankings and pull request activity. It combines current install counts from RuneLite with snapshots collected here and pull request history from `runelite/plugin-hub`. GitHub Actions refreshes the data every six hours.

The project is independent of RuneLite and Jagex. Install history starts with the first collection because RuneLite only provides current counts.

## Local development

Requires Node 24 or newer.

```sh
npm install
npm run dev
```

The dev command rebuilds the datasets from `data/` into the ignored `public/data/` directory before starting Vite. Run `npm run check` to lint the code, validate source data and build the site.

## Updating data

The scheduled workflow collects install counts and GitHub pull request history, commits the refreshed source data and deploys the site. To run both collectors locally, set `GITHUB_TOKEN` and run `npm run sync`. Use `npm run sync:runelite` to collect install data without a token, or `npm run sync:github` to collect pull request history with one.
