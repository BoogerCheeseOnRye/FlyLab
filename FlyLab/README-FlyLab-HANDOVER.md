# FlyLab HANDOVER

## What's in here

This is the FlyLab-only package repacked for simplicity. It contains just the web app, tests, and tooling needed to run FlyLab locally or publish it.

## Quick Start (Local)

```bash
cd app
node serve.js
```

Then open http://localhost:8080 (or the port shown).

## GitHub Pages

The `docs/` directory mirrors `app/`. To publish as GitHub Pages (from main branch, /docs folder):
1. Commit everything
2. In GitHub repo settings → Pages, set Source to "Deploy from a branch", Branch: main, Folder: /docs
3. Pages will build automatically.

## Files

- app/ - FlyLab web app (served)
- docs/ - Copy of app/ for GitHub Pages
- node-tests/ - Test suite and tooling
- selfcheck.mjs - Run to verify setup
- make-backup.mjs - Create tarball backup
- launch.sh, peer.log, E200HA-HANDOFF.md, README.md - Supporting files

