# Project: StaySharp (v2)

## Current Status
We are developing a Progressive Web Application (PWA) for knife sharpening calculation and management (StaySharp_v2). It replicates and improves upon a previous Django-based version.

## Recent Work
We just completed a major overhaul of the Predictive Analytics ("Подбор Угла") feature:
1.  **Separated UI:** We moved the angle predictor out of the main calculator tab (`calc-view`) and into its own dedicated view (`predict-view`).
2.  **Reactive Autofill:** The fields (Brand, Series, Steel, Carbon, CrMoV) now instantly react to user input via the `input` event, thanks to logic in `app.js`.
3.  **Datalists:** `brand-list`, `series-list`, and `steel-list` datalists are populated automatically on page load based on unique values in `knives.js` to provide auto-complete suggestions.
4.  **Constraint Solver:** An intelligent constraint solver was implemented in `triggerPrediction()` inside `app.js`. It sets the currently edited field as an "anchor", and if a conflict arises (no matching records in the database), it clears old incompatible values from other fields automatically so the user never gets stuck.
5.  **Integration with Calculator:** After finding an angle, the user presses "Применить к станку" which navigates back to the calculator and pre-fills the data.

## Next Steps / Technical Debt
- The user may want to continue testing the new auto-fill logic.
- We might need to handle empty/missing database values more dynamically or expand `knives.js` if the user wants certain popular brands (like Victorinox or Miyabi) to have preset steels in the future.
