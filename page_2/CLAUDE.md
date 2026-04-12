# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

VinUni **COMP4010 Data Visualization — Project 1**: Palmer Penguins interactive dashboard (Python + Dash + Plotly). This is a multi-page team project; the owner of this directory is **Person B, responsible for Page 2 — "Island Detail Explorer"**. The full Page 2 specification lives in `Page2_PRD.md` and is the source of truth for design decisions — read it before implementing UI or callbacks.

No application code exists yet. This directory currently holds the PRD, the cleaned dataset, reference mockups, and the style guide. Expect to scaffold the Dash app from scratch.

## Data

- **`penguins_clean.csv`** — the canonical dataset. Columns: `species, island, bill_length_mm, bill_depth_mm, flipper_length_mm, body_mass_g, sex, year`. Already cleaned (NaNs removed). Load once and share across callbacks via a `dcc.Store` or module-level DataFrame.
- Species: Adelie, Chinstrap, Gentoo. Islands: Biscoe, Dream, Torgersen.

## Design System (must follow)

The **OHA Style Guide** (`OHA_StyleGuide_2024_July.pdf`) is the grading rubric. Key rules baked into `Page2_PRD.md`:

- **Chart titles are takeaway sentences**, not axis labels. Example: `"GENTOO PENGUINS ARE HEAVIER WITH LONGER FLIPPERS"` — generate dynamically from filtered group means.
- **Color encodes species only** (Adelie `#FF6B6B`, Chinstrap `#4DA8DA`, Gentoo `#1B4965`). **Shape encodes sex** (circle=male, diamond=female). Never overload color with sex.
- Icy theme: page bg `#F4FAFF`, sidebar `#E8F4FD`, header `#1B4965`. De-emphasized data uses `#C8D8E4` gray.
- No chart borders, faint `#E8E8E8` gridlines, horizontal axis text, comma separators on body mass, 1-decimal rounding (avoid false precision).

## Page 2 Architecture — The Key Insight

The distinguishing interaction is an **SVG penguin illustration as the axis selector**: clicking on bill/flipper/body zones assigns features to the scatter plot's X and Y axes. This replaces dropdowns. Implementation notes:

- Build the penguin as inline SVG inside a Dash component (html.Div with dangerously_set_inner_html via dash-svg, or an SVG template string). Each zone is a `<path>` with an `id` and `aria-label`.
- Wire `clickData` / `n_clicks` from each zone path to a callback that maintains X/Y selection state in a `dcc.Store`.
- **Third-click replaces oldest selection** (FIFO), clicking a selected zone deselects it. See PRD §4 for the exact state machine.
- All four charts (scatter, bar, boxplot, stats, insight text) must update from one shared filtered DataFrame. Prefer a single upstream callback that outputs filtered data to a `dcc.Store`, then downstream callbacks per chart — avoids recomputing filters N times.
- **Boxplot Y feature is linked to scatter plot Y** (not independent) — reduces cognitive load.
- Dynamic insight text is auto-generated from group means in the filtered data (PRD §10 has the logic).

## Working With This Repo

- There is no build system yet. When scaffolding, use `pip install dash plotly pandas` and run `python app.py`. Keep `requirements.txt` minimal.
- PNG files (`penguin_all.png`, `culmen_depth.png`, etc.) are **visual references / mockups**, not assets to ship. The actual penguin selector must be SVG to be interactive.
- `Page2_PRD.md` is stable — if the design needs to change, update the PRD in the same commit as the code change so the spec and implementation stay aligned.
