# Fuel Requisition Module - Integration Plan
## DPWH Regional Office II - Fleet Management System

**Version:** 2.7  
**Last Updated:** December 1, 2025 (late PM update)  
**Change:** EMD validation UX tightened: contracts auto-filter/auto-select by supplier; “Valid until” validates in real time against trip start; EMD sees full request details; Destination column removed for compact tables; Destination/Purpose inputs auto-uppercase with clear buttons. Docs set (UX/CODE/AUTOCOMPLETE/TESTING/TROUBLESHOOTING/DB).

**Implementation Progress (Dec 1, 2025):**
- • Phase 7 COMPLETE: All edit capabilities fully implemented and working
- • Driver request edit form population fixed (useRef + two-phase approach)
- • Receipt verification handler implemented with contract deduction
- • Success modal redesigned with professional CheckCircle/AlertCircle icons
- • All dashboard pages improved with real-time Firebase metrics
- • Concurrency protection working in all edit/save flows
- • New status `RECEIPT_RETURNED` active throughout system
- • Table compactness: Destination removed from list view; actions easier to scan
- • Form UX: Destination + Purpose auto-uppercase with clear buttons for fast edits
- • Validation UX: “Valid until” blocks dates later than start in real time; extra request details shown to EMD
- • Contracts: Auto-filter and auto-select contracts matching the supplier during validation
- • Documentation: Added UX patterns, code patterns, autocomplete guide, testing and troubleshooting docs

---

## Table of Contents

1. [Overview](#overview)
2. [System Roles](#system-roles)
3. [Workflow Diagram](#workflow-diagram)
4. [Status Flow](#status-flow)
5. [Edit Permissions System](#edit-permissions-system)
6. [Database Schema](#database-schema)
7. [Recent Feature Additions (v2.4)](#recent-feature-additions-v24)
8. [Receipt Image Strategy](#receipt-image-strategy)
9. [File Structure](#file-structure)
10. [Integration Checklist](#integration-checklist)
11. [Detailed TODO](#detailed-todo)
12. [Code Patterns](#code-patterns)
13. [UI Screens Breakdown](#ui-screens-breakdown)
14. [Business Logic](#business-logic)
15. [Printable RIS Template](#printable-ris-template)
16. [Receipt Archive System](#receipt-archive-system)

---

## Overview

**Module Name:** Fuel Requisition and Issue Slip (RIS) Management  
**Purpose:** Digitize the fuel requisition process from request to receipt verification  
**Integration:** Add to existing Fleet Management System (Trip Tickets module already exists)

### Key Features
- Driver creates fuel requests
- **Driver can edit requests before validation** — NEW v2.4
- EMD Staff validates quantity and assigns contracts
- **EMD can edit validation before RIS issuance** — NEW v2.4
- SPMS Staff issues RIS numbers and manages fuel prices
- **SPMS can void issued RIS** — NEW v2.4
- Contract balance tracking (PESO-based, not volume-based)
- Receipt verification and automatic contract deduction
- **Driver can re-upload receipts before verification** — NEW v2.4
- Printable RIS form matching government format
- **Receipt image storage with Base64 (cost-efficient)**
- **Receipt archive & delete to manage storage**
- **Concurrency protection for simultaneous edits** — NEW v2.4

---

## System Roles

| Role | Existing? | Fuel Requisition Responsibilities |
|------|-----------|----------------------------------|
| `admin` | • Yes | Full access, system config, issuance signatory setup, **receipt archive** |
| `driver` | • Yes | Create requests, submit invoices/receipts |
| `emd` | • Yes (unused) | Validate requests, verify receipts, assign contracts |
| `spms` | • Yes | Issue RIS, update fuel prices, manage contracts |

### Offline Signatories (Physical signatures only - NOT system users)
- **Requesting Officer** — Auto-filled from `offices.signatoryId`
- **Approving Authority** — Auto-filled from `approving_authorities`
- **Issued by** — Auto-filled from `organization_settings.issuanceSignatoryId`
- **Checked as to quantity** — Logged-in EMD Staff name
- **Received by** — Logged-in Driver name

---

## Workflow Diagram

```
[diagram omitted for brevity in v2.6; see v2.4 for ASCII swimlane]
```

### Detailed Steps

| Step | Actor | Action | System Response |
|------|-------|--------|-----------------|
| 1 | Driver | Creates fuel request | Status → `PENDING_EMD` |
| 2 | EMD Staff | Reviews, assigns contract, sets validity | Status → `EMD_VALIDATED` |
| 3 | SPMS Staff | Verifies contract balance, issues RIS | Status → `RIS_ISSUED`, generates RIS number |
| 4 | Driver | Prints RIS, gets physical signatures | OFFLINE |
| 5 | Driver | Gets fuel at gas station | OFFLINE |
| 6 | Driver | Uploads receipt image (Base64), enters actual liters | Status → `RECEIPT_SUBMITTED` |
| 7 | EMD Staff | Verifies receipt matches RIS | Status → `COMPLETED`, contract deducted |

---

## Status Flow

- `PENDING_EMD` → `EMD_VALIDATED` → `RIS_ISSUED` → `AWAITING_RECEIPT` → `RECEIPT_SUBMITTED` → `COMPLETED`
- Exception paths: `RETURNED` (EMD to Driver), `REJECTED` (EMD), `RECEIPT_RETURNED` (EMD to Driver), `CANCELLED` (Driver/Admin), `VOIDED` (SPMS/Admin)

---

## Edit Permissions System (v2.4+)

- Driver can edit while `PENDING_EMD` or `RETURNED`
- EMD can edit validation while `EMD_VALIDATED`
- Driver can re-upload receipts while `RECEIPT_SUBMITTED` or `RECEIPT_RETURNED`
- SPMS can void while `RIS_ISSUED`/`EMD_VALIDATED`
- All edits guarded by `updatedAt` concurrency checks

---

## Database Schema

See `docs/DATABASE-SCHEMA.md` for full field list (fuel requisitions, contracts, vehicles, suppliers, transactions, trip tickets).

---

## Recent Feature Additions (v2.4+)

- Edit permissions across roles with concurrency protection
- Contract deduction during receipt verification
- Base64 receipt handling with archive/delete
- Printable RIS template aligned to government format
- Dashboard metrics live from Firebase
- **v2.6 UI polish:** Destination removed from list table; Destination/Purpose auto-uppercase with clear buttons in the form; new UX/CODE/AUTOCOMPLETE/TESTING/TROUBLESHOOTING docs added.

---

## Receipt Image Strategy

- Store Base64 temporarily; archive older receipts when not needed
- Optional conversion to compressed JPG using `browser-image-compression`
- Track `imageArchivedAt` for cleanup routines

---

## File Structure (key)
- `src/pages/FuelRequisitionsPage.tsx` — main controller for tabs/workflows
- `src/features/fuel-requisition/components/*` — forms, lists, modals
- `docs/*` — integration plan, progress, patterns, guides

---

## Integration Checklist
- [x] Firestore rules loaded and tested
- [x] Roles mapped (`driver`, `emd`, `spms`, `admin`)
- [x] Counters collection set for `fuel_requisition_ref`
- [x] Contract deduction tested on verification
- [x] Receipt upload and return flow tested
- [x] Printable RIS tested
- [x] Concurrency checks validated
- [x] UI compactness verified (Destination column removed)
- [x] Uppercase enforcement verified for Destination/Purpose fields

---

## Detailed TODO
- Automate image archival/cleanup (batch)
- Add E2E test script for request→receipt→verification happy path
- Add contract exhaustion alerting when balance < threshold

---

## Code Patterns
- Use `react-hook-form` + `zodResolver` for all forms
- Use `serverTimestamp()` for writes; guard with `updatedAt` when editing
- Keep date inputs in ISO `YYYY-MM-DD`; convert `Timestamp` via `.toDate()`
- Prefer `Input`/`Textarea` UI components (support clear buttons + uppercase)

---

## UI Screens Breakdown
- Fuel Requests: create, list, edit, validation, issuance, receipt submission/verification
- Contracts: list/add/edit, transactions, balance status
- Suppliers: list/add/edit, activation toggle
- Vehicles: list/add/edit with CSV import and autocomplete
- Trip Tickets: create/edit, approvals

---

## Business Logic
- Contract balance deducted on receipt verification; transaction record created
- Validation assigns contract and sets validity window
- Void resets RIS issuance and marks as `VOIDED`
- Return/Rejection paths capture remarks

---

## Printable RIS Template
- Matches DPWH RIS layout with RIS number, contract, supplier, liters, plates, signatures

---

## Receipt Archive System
- `imageArchivedAt` marks when receipts are archived/deleted
- Future: move to cold storage; clean up inline Base64
