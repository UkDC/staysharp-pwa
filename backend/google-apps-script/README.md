# Google Apps Script Backend

This folder stores the source-of-truth backend code for StaySharp cloud sync.

## Files
- `Code.gs` - full web app backend (`doGet`, `doPost`, `onEdit`).

## One-time setup
1. Open your Apps Script project.
2. Copy content of `Code.gs` from this folder into Apps Script editor.
3. In `Project Settings -> Script Properties`, set:
   - key: `API_TOKEN`
   - value: `StaySharp_Secure_Token_2026`
4. In `History` sheet ensure headers exist, including `UpdatedAt`.

## Deploy
1. `Deploy -> Manage deployments`
2. Edit active web app deployment.
3. Select `New version`.
4. `Execute as`: `Me`
5. `Who has access`: `Anyone` (or `Anyone with the link`)
6. `Deploy`

## Quick verification
1. GET check:
   - `.../exec?token=StaySharp_Secure_Token_2026&sheet=History`
2. Save a record from PWA.
3. Verify row appears in `History`.
