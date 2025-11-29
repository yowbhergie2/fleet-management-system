# Troubleshooting

Common issues and quick fixes.

## Forms not populating on edit
- **Symptom:** Inputs stay blank after selecting “Edit”.
- **Fix:** Ensure custom inputs support uncontrolled resets (they do now). Confirm `defaultValues` and `reset` receive string values for dates/numbers.

## Firestore permission errors
- **Symptom:** Reads/Writes fail with permission denied.
- **Fix:** Check `firestore.rules` alignment with collection/field. Verify user `organizationId` and role checks. Use the same casing for collection names.

## Missing autocomplete suggestions
- **Symptom:** Dropdown empty even after entries.
- **Fix:** LocalStorage may be blocked or cleared. Add a new entry to rebuild suggestions. Ensure `onFocus` shows dropdown and max height allows scroll.

## Stale update blocked
- **Symptom:** “This request was updated by another user.”
- **Fix:** Reload data to get the latest `updatedAt` and re-apply changes. Avoid multi-tab edits on the same record.

## Contract balance mismatch
- **Symptom:** Remaining balance incorrect after verification.
- **Fix:** Confirm `transactionType` entries exist for initial and deductions. Check verification payload computes `totalAmount = actualLiters * priceAtPurchase`.

## Date/time off by timezone
- **Symptom:** Dates display a day earlier/later.
- **Fix:** Always convert `Timestamp` via `.toDate()` and format in local time. Store dates as `Timestamp` (server) to avoid client timezone drift.
