# Testing Guide

Lightweight checks to keep quality up without full CI.

## Frontend Smoke
- `npm run dev` and navigate key flows:
  - Fuel Requisition: create, edit, validate, issue, submit/verify receipt.
  - Trip Ticket: create/edit ticket, add/remove passengers.
  - Master Data: add/edit vehicles, suppliers, contracts.
- Verify error states: leave required fields blank to confirm inline errors show.

## Autocomplete
- For each form with autocomplete, type partial text and pick a suggestion; ensure value writes back to the field and validation passes.
- Refresh and confirm suggestions persist where stored in `localStorage`.

## Data Integrity
- After creating/updating records, confirm Firestore documents contain expected fields and `updatedAt` is set (using Firestore console if needed).
- For contract verification, verify `remainingBalance` matches initial amount minus deductions.

## Concurrency
- Edit the same requisition/contract from two tabs; ensure stale update warning prevents overwrite.

## Print/Download (if applicable)
- Generate PDFs (e.g., trip ticket) and confirm no missing fields or broken images.

## Quick Commands
- Lint: `npm run lint`
- Build: `npm run build`

## Checklist Before Delivery
- Required fields validated; no console errors.
- Autocomplete dropdowns appear and close correctly.
- Modals open/close and block background scroll.
- Mobile view checked for overflow on key pages.
