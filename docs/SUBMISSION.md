# Submission Checklist — Silver Flag CSR

**Deadline: 13 July** · Mission: Resilient Disaster Response

## Required deliverables

| # | Item | Location | Status |
|---|---|---|---|
| 1 | 3-slide pitch deck | `docs/PITCH_DECK.md` (export to PDF/slides) | ✅ Content ready |
| 2 | 5-minute team pitch | Record using `docs/PITCH_DECK.md` script | ⬜ Team records |
| 3 | Short PoC demo video | Run `scripts/demo-golden-path.sh` + screen record | ⬜ Team records |
| 4 | GitHub repository | Push `Aurora/` (exclude `.env`, `node_modules`, `*.db`) | ⬜ Push to GitHub |

## Demo recording steps

### Terminal setup (3 panes)

```bash
# Pane 1 — AI
cd services/ai && source .venv/bin/activate && uvicorn main:app --port 8001

# Pane 2 — API
cd services/api && npm run dev

# Pane 3 — Dashboard
cd apps/dashboard && npm run dev
```

### Record sequence (~3 min)

1. Show login screen → sign in as coordinator
2. Show dashboard baseline (all green)
3. Run: `FAST=1 ./scripts/demo-golden-path.sh`
4. Shelter B turns CRITICAL on map
5. Alert appears → show reroute recommendation
6. Click **Accept reroute** → green "Reroute active" panel
7. (Optional) Show Webex space with bot alert if credentials set

### Export pitch deck

Open `docs/PITCH_DECK.md` → copy slides into Google Slides / Canva / PowerPoint (3 slides only).

## Pre-push git hygiene

```bash
# Verify .gitignore excludes secrets and artifacts
git status
# Should NOT see: .env, node_modules/, *.db, dist/
```

## Judging alignment

- ✅ Focus: disaster shelter coordination pain
- ✅ Design: measurable improvement (15 min → 30 sec)
- ✅ Architect: `docs/PROJECT.md` + data flow
- ✅ Prove: Cisco clients in `services/api/src/cisco/`
- ✅ Demo: golden path script + dashboard
