# Project: StaySharp_PWA

## Current Status
We are developing a Progressive Web Application (PWA) for knife sharpening calculation and management (StaySharp_PWA). It leverages Vanilla JS, HTML, CSS (Glassmorphism), and LocalStorage. The app communicates with a Google Apps Script to synchronize its database and history, effectively using Google Sheets as a serverless backend.

## Recent Work (Completed Architecture)
1. **Google Sheets Integration:** Created two-way synchronization for both «Журнал» (History) and «Справочник» (Database). The user can now modify the database directly from Google Sheets (PC) and pull the latest changes to their phone via the `Синхронизировать 🔄` buttons.
2. **Cloud Backend:** Dropped local CSV exporting from the History tab since the app pushes records directly to Google Sheets via `no-cors` POST requests, and pulls them seamlessly via a GET fetch. 
3. **Categories Support:** Extracted and parsed `Category` columns from the DB to support styling tags like `High` (green) and `Premium` (red).
4. **Predictive Analytics ("Подбор Угла"):** An intelligent constraint solver automatically suggests grind angles/honing additions based on Brand, Series, Steel, Carbon, or CrMoV content.
5. **PWA & Cache Management:** A custom `./deploy.sh` script automatically bumps cache versions (`?v=XXXXX` in `index.html`) to aggressively bust iOS Safari caches. No manual reloading is needed.

## Project Structure & Flow
- The master repo changed from `staysharp-v2` to `staysharp-pwa`.
- **`app.js`**: Contains live calculation logic, event listeners for the `Predict` solver, UI rendering for the tables, and the `fetch` synchronization logic.
- **Google Apps Script**: Expected to accept GET with `?sheet=History` and return JSON. Expected to accept POST to append/update/delete records based on `id` in the `History` sheet.

## Next Steps for the Next Session
- Continue refining UI elements or adding new fields if the user extends the Google Sheet.
- Address any edge cases in predictive analytics if the user introduces radically different parameters to the standard database.
