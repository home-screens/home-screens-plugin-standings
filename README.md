# Sports Standings Plugin

A plugin for [Home Screens](https://homescreens.dev) — the open-source smart display system for Raspberry Pi — that shows live sports standings for 12 leagues, powered by ESPN.

## Features

- **12 leagues**: NFL, NBA, MLB, NHL, WNBA, MLS, Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga MX
- **3 views**: Table, Compact, and Conference
- **3 grouping modes**: By Division, By Conference, Full League
- **Playoff cutoff line** with configurable visibility
- **Auto-rotation** through groups with a configurable interval
- **Team color accents** with adjustable opacity

No API key required — ESPN's public endpoints are used by default.

## Installation

Install this plugin from the Plugin Store inside the Home Screens editor, or download a release tarball from the [Releases](https://github.com/home-screens/home-screens-plugin-standings/releases) page and side-load it.

For general Home Screens setup, see the [documentation](https://homescreens.dev/docs).

## Configuration

| Setting | Default | Description |
|---|---|---|
| View | `table` | One of `table`, `compact`, `conference` |
| League | `nba` | Any of the 12 supported leagues |
| Grouping | `conference` | `division`, `conference`, or `league` |
| Teams to Show | `0` (all) | Cap the number of teams per group |
| Playoff Cutoff Line | `true` | Show the visual playoff-seed separator |
| Rotation | `10s` | How long each group is displayed before rotating |
| Refresh | `5 min` | How often to fetch fresh data from ESPN |
| Team Color Intensity | `16` | Accent bar opacity (table view only) |

## Building

```bash
npm install
npm run build   # Produces dist/bundle.js
npm run dev     # Watch + serve on localhost:5173 for dev-mode loading
```

See the [plugin template README](https://github.com/home-screens/home-screens-plugin-template) for details on the plugin SDK, manifest format, and development workflow.

## License

MIT
