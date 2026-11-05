#!/usr/bin/env bash
#
# publish.sh — publish the site to Firebase Hosting (lovearound.me), and the
# old needed-app.web.app site, which only redirects there.
#
# Only the pages: the apps' downloads and update feeds are GitHub releases of
# their own repos (mac, windows, linux), and firebase.json redirects
# /download/… to the latest of each, so publishing the site never touches them.
#
# Terraform (the server repo, deploy/hosting.tf) owns the hosting sites; this
# script owns their content. firebase-tools runs in a node container and
# authenticates with the host's gcloud Application Default Credentials.
# Idempotent and re-runnable.
#
# Env overrides (all optional): PROJECT_ID, ADC
#
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-needed-app-2026}"
ADC="${ADC:-$HOME/.config/gcloud/application_default_credentials.json}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[[ -f "$ADC" ]] || { echo ">> no ADC at $ADC — run 'gcloud auth application-default login'"; exit 1; }

# The translated pages (public/<lang>, /i, /signin) are built from src/.
python3 "$ROOT/build.py"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp "$ROOT/firebase.json" "$ROOT/.firebaserc" "$STAGE/"
cp -R "$ROOT/public" "$ROOT/redirect" "$STAGE/"

echo ">> deploying hosting on ${PROJECT_ID}"
docker run --rm \
  -v "$STAGE:/site" -w /site \
  -v "$ADC:/adc.json:ro" -e GOOGLE_APPLICATION_CREDENTIALS=/adc.json \
  node:22-slim \
  npx --yes firebase-tools@13.29.1 deploy \
    --project "$PROJECT_ID" --only hosting --non-interactive \
    --message "$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%s)"
echo ">> done: https://lovearound.me"
