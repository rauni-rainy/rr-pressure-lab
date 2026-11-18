# SupeRR Pressure Lab

An interactive, frontend-only explanation of the pressure-reliability model used to assess IPL 2027 auction options for Rajasthan Royals.

## What it shows

- Audited batter and bowler rankings drawn from 813 completed IPL and T20I matches (2022–2026).
- A live **Pressure Lab** that rebuilds the pre-ball pressure score for a chase or first-innings scenario.
- A **Value Lab** that turns runs, dismissals and wickets into value above fair expectation.
- A **Reliability Sandbox** that makes the 55 / 30 / 15 final-score weighting visible and interactive.
- A full eligible-player evidence plot, plus an explicitly separate RR auction-availability overlay.

## Model, in plain terms

The model does not reward famous names or raw totals. It first identifies difficult moments, evaluates each delivery against comparable pre-ball situations, then asks whether a player repeated that edge often enough to trust.

```text
Pressure (chase)
= 0.55 × rate stress + 0.25 × wicket pressure + 0.20 × lateness

Batting value
= runs − expected runs − 4.5 × (dismissal − expected dismissal)

Bowling value
= expected runs − bowler runs + 4.5 × (credited wicket − expected wicket)

Reliability score
= clip(50 + 10 × [0.55 × cautious quality
                  + 0.30 × pressure uplift
                  + 0.15 × match repeatability], 0, 100)
```

Safeguards protect against an attractive but thin sample: leave-player-out benchmarks, 70-effective-ball shrinkage, an eight-pressure-match / 60-pressure-ball gate, recency weighting and a 1.25× IPL relevance weight.

## Reproduce locally

No build system is needed for the published dashboard. To regenerate `data.js` from the model outputs:

```powershell
node tools/generate-data.mjs
```

Then serve this folder with any static HTTP server. The repository ships with a tiny Node preview utility:

```powershell
node tools/preview-server.mjs . 4173
```

## Data boundary

The historical ranking is deliberately separate from player availability, medical status, retention decisions and auction prices. The Rajasthan Royals overlay is a decision aid, not a claim that any named player will definitely enter or clear the auction.

## Deployment

This site is intended for GitHub Pages from the `main` branch, `/ (root)` folder. It has no server, database, tracker or API key.
