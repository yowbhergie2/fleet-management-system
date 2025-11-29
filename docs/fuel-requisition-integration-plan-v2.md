# Fuel Requisition Module - Integration Plan
## DPWH Regional Office II - Fleet Management System

**Version:** 2.3
**Last Updated:** November 30, 2025
**Change:** Added autocomplete for destination and purpose fields, implemented sequential FR-XXXXXX reference numbers with auto-increment counter, improved purpose display with semicolon separators, updated Firestore rules for counters collection.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Roles](#system-roles)
3. [Workflow Diagram](#workflow-diagram)
4. [Status Flow](#status-flow)
5. [Database Schema](#database-schema)
6. [Recent Feature Additions (v2.3)](#recent-feature-additions-v23) ⭐ NEW
7. [Receipt Image Strategy](#receipt-image-strategy)
8. [File Structure](#file-structure)
9. [Integration Checklist](#integration-checklist)
10. [Detailed TODO](#detailed-todo)
11. [Code Patterns](#code-patterns)
12. [UI Screens Breakdown](#ui-screens-breakdown)
13. [Business Logic](#business-logic)
14. [Printable RIS Template](#printable-ris-template)
15. [Receipt Archive System](#receipt-archive-system)

---

## Overview

**Module Name:** Fuel Requisition and Issue Slip (RIS) Management  
**Purpose:** Digitize the fuel requisition process from request to receipt verification  
**Integration:** Add to existing Fleet Management System (Trip Tickets module already exists)

### Key Features
- Driver creates fuel requests
- EMD Staff validates quantity and assigns contracts
- SPMS Staff issues RIS numbers and manages fuel prices
- Contract balance tracking (PESO-based, not volume-based)
- Receipt verification and automatic contract deduction
- Printable RIS form matching government format
- **Receipt image storage with Base64 (cost-efficient)** ⭐ NEW
- **Receipt archive & delete to manage storage** ⭐ NEW

---

## System Roles

| Role | Existing? | Fuel Requisition Responsibilities |
|------|-----------|----------------------------------|
| `admin` | ✅ Yes | Full access, system config, issuance signatory setup, **receipt archive** |
| `driver` | ✅ Yes | Create requests, submit invoices/receipts |
| `emd` | ✅ Yes (unused) | Validate requests, verify receipts, assign contracts |
| `spms` | ✅ Yes | Issue RIS, update fuel prices, manage contracts |

### Offline Signatories (Physical signatures only - NOT system users)
- **Requesting Officer** → Auto-filled from `offices.signatoryId`
- **Approving Authority** → Auto-filled from `approving_authorities`
- **Issued by** → Auto-filled from `organization_settings.issuanceSignatoryId`
- **Checked as to quantity** → Logged-in EMD Staff name
- **Received by** → Logged-in Driver name

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FUEL REQUISITION WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  DRIVER  │     │   EMD    │     │   SPMS   │     │  DRIVER  │     │   EMD    │
  │ Creates  │────▶│ Validates│────▶│  Issues  │────▶│  Submits │────▶│ Verifies │
  │ Request  │     │ Request  │     │   RIS    │     │ Receipt  │     │ Receipt  │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │                │                │                │                │
       ▼                ▼                ▼                ▼                ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Status: │     │  Status: │     │  Status: │     │  Status: │     │  Status: │
  │ PENDING  │     │   EMD    │     │   RIS    │     │ RECEIPT  │     │COMPLETED │
  │   _EMD   │     │VALIDATED │     │ ISSUED   │     │SUBMITTED │     │          │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                         │                                  │
                                         ▼                                  ▼
                                  ┌─────────────┐                   ┌─────────────┐
                                  │   OFFLINE   │                   │  CONTRACT   │
                                  │ Get fuel at │                   │  AUTO-      │
                                  │ gas station │                   │  DEDUCTED   │
                                  └─────────────┘                   └─────────────┘
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
| 8 | Admin | Monthly: Archives images, deletes from DB | Images archived locally, DB cleaned |

---

## Status Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STATUS TRANSITIONS                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │    DRAFT    │ (Optional - if save as draft)
                              └──────┬──────┘
                                     │ Submit
                                     ▼
                              ┌─────────────┐
              ┌───────────────│ PENDING_EMD │───────────────┐
              │ Return        └──────┬──────┘        Reject │
              ▼                      │ Approve              ▼
       ┌─────────────┐               │               ┌─────────────┐
       │  RETURNED   │               ▼               │  REJECTED   │
       └─────────────┘        ┌─────────────┐        └─────────────┘
                              │EMD_VALIDATED│
                              └──────┬──────┘
                                     │ Issue RIS
                                     ▼
                              ┌─────────────┐
                              │ RIS_ISSUED  │──────────────┐
                              └──────┬──────┘       Cancel │
                                     │                     ▼
                                     │              ┌─────────────┐
                                     │              │  CANCELLED  │
                                     │              └─────────────┘
                                     │ (Offline: Get fuel)
                                     ▼
                              ┌─────────────┐
                              │  AWAITING   │
                              │   RECEIPT   │
                              └──────┬──────┘
                                     │ Submit receipt
                                     ▼
                              ┌─────────────┐
                              │  RECEIPT    │
                              │  SUBMITTED  │
                              └──────┬──────┘
                                     │ Verify
                                     ▼
                              ┌─────────────┐
                              │  COMPLETED  │ → Contract auto-deducted
                              └─────────────┘
```

---

## Receipt Image Strategy ⭐ NEW

### Why Base64 Instead of Firebase Storage?

| Aspect | Firebase Storage | Base64 in Firestore |
|--------|-----------------|---------------------|
| **Monthly Cost** | ~$0.50 - $2.00 per 1000 images | ~$0.10 (extra read size) |
| **Setup** | Already configured | No extra setup |
| **Max File Size** | 5GB | ~750KB (after compression) |
| **Offline Support** | Needs separate caching | Works with PWA automatically |
| **Cleanup** | Manual file deletion | Just set field to null |

### Image Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       RECEIPT IMAGE LIFECYCLE                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  UPLOAD  │────▶│  VERIFY  │────▶│ ARCHIVE  │────▶│  DELETE  │
  │  (temp)  │     │  (view)  │     │  (save)  │     │ (cleanup)│
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │                │                │                │
       ▼                ▼                ▼                ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Firestore│     │ EMD sees │     │ Download │     │ Base64   │
  │ Base64   │     │ image in │     │ ZIP to   │     │ field =  │
  │ ~500KB   │     │ system   │     │ local PC │     │ null     │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘

  Timeline:  Day 1        Day 1-3      Monthly       After archive
             (Driver)     (EMD)        (Admin)       (Automatic)
```

### Storage Comparison Per Receipt

| Phase | Image Location | Firestore Size |
|-------|----------------|----------------|
| Driver uploads | Firestore (Base64) | ~500KB |
| EMD verifies | Firestore (Base64) | ~500KB |
| Admin archives (monthly) | Local ZIP file | ~500KB |
| After archive | DELETED from DB | ~100 bytes |

### What Gets Kept vs Deleted

| Data | After Archive | Storage |
|------|---------------|---------|
| `receiptBase64` | ❌ DELETED | 0 KB |
| `chargeInvoiceNumber` | ✅ KEPT | ~20 bytes |
| `chargeInvoiceDate` | ✅ KEPT | 8 bytes |
| `actualLiters` | ✅ KEPT | 8 bytes |
| `priceAtPurchase` | ✅ KEPT | 8 bytes |
| `totalAmount` | ✅ KEPT | 8 bytes |
| `verifiedBy`, `verifiedAt` | ✅ KEPT | ~50 bytes |
| `imageArchivedAt` | ✅ ADDED | 8 bytes |

**Result:** Full audit trail remains, only image removed! 🎯

---

## Database Schema

### Existing Collections (No changes needed)

```typescript
// Already in your system - just reference them
signatories        // name, position, organizationId
offices            // code, name, signatoryId, organizationId  
approving_authorities  // officerId, prefix, organizationId
vehicles           // dpwhNumber, brand, model, plateNumber, fuelType, status
users              // email, displayName, role, organizationId, isActive
```

### New Collections

#### 1. `organization_settings`
```typescript
// Document ID: {organizationId}
{
  organizationId: string;           // "org_dtt-ris"
  issuanceSignatoryId: string;      // Reference to signatories collection
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. `suppliers`
```typescript
{
  id: string;                       // Auto-generated
  name: string;                     // "JLL GASOLINE STATION"
  address: string;
  contactPerson: string | null;
  contactNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 3. `contracts`
```typescript
{
  id: string;                       // Auto-generated
  contractNumber: string;           // "POL-2025-001"
  supplierId: string;               // Reference to suppliers
  supplierName: string;             // Denormalized for display
  totalAmount: number;              // 500000.00 (PESO budget)
  remainingBalance: number;         // 148250.00 (PESO remaining)
  startDate: Timestamp;
  status: "ACTIVE" | "EXHAUSTED";
  exhaustedAt: Timestamp | null;    // When balance hit zero
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 4. `fuel_prices`
```typescript
{
  id: string;
  fuelType: "DIESEL" | "GASOLINE" | "PREMIUM";
  pricePerLiter: number;            // 57.60
  effectiveDate: Timestamp;         // Always a Tuesday
  supplierId: string;               // Reference to suppliers
  supplierName: string;             // Denormalized
  isCurrent: boolean;               // true for latest price
  isVoided: boolean;                // For voided prices
  voidedReason: string | null;
  updatedBy: string;                // User ID (SPMS Staff)
  updatedByName: string;
  organizationId: string;
  createdAt: Timestamp;
}
```

#### 5. `fuel_requisitions` ⭐ UPDATED
```typescript
{
  id: string;

  // RIS Number (generated when issued)
  risNumber: string | null;         // "2025-11-8225"
  refNumber: number | null;         // Auto-increment counter (1, 2, 3...)
                                    // Display as: FR-000001, FR-000002, etc.
  
  // Office & Signatories
  officeId: string;
  officeName: string;               // Denormalized
  requestingOfficerId: string;      // From offices.signatoryId
  requestingOfficerName: string;
  requestingOfficerPosition: string;
  approvingAuthorityId: string;
  approvingAuthorityName: string;
  approvingAuthorityPosition: string;
  authorityPrefix: string;          // "By Authority of the Regional Director:"
  issuanceSignatoryId: string | null;
  issuanceSignatoryName: string | null;
  issuanceSignatoryPosition: string | null;
  
  // Vehicle & Driver
  vehicleId: string;
  dpwhNumber: string;               // "H1-7110"
  vehicleDescription: string;       // "Nissan Navara Calibre A/T"
  plateNumber: string;
  fuelType: "DIESEL" | "GASOLINE" | "PREMIUM";
  driverId: string;
  driverName: string;
  
  // Trip Details
  passengers: string;               // "James T. Manguilin et.al."
  inclusiveDateFrom: Timestamp;
  inclusiveDateTo: Timestamp;
  destination: string;
  purpose: string;
  
  // Fuel Request
  requestedLiters: number;          // What driver requested
  validatedLiters: number | null;   // What EMD approved
  actualLiters: number | null;      // What driver actually received
  
  // Contract & Pricing
  contractId: string | null;
  contractNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  priceAtIssuance: number | null;   // Price when RIS issued (estimate)
  priceAtPurchase: number | null;   // Actual price from invoice
  totalAmount: number | null;       // actualLiters × priceAtPurchase
  
  // Validity
  validUntil: Timestamp | null;     // RIS validity date (set by EMD)
  
  // Status
  status: FuelRequisitionStatus;
  
  // EMD Validation
  emdValidatedBy: string | null;
  emdValidatedByName: string | null;
  emdValidatedAt: Timestamp | null;
  emdRemarks: string | null;
  
  // SPMS Issuance
  issuedBy: string | null;
  issuedByName: string | null;
  issuedAt: Timestamp | null;
  
  // Last Issuance Info (from previous completed request for same vehicle)
  lastIssuance: {
    risNumber: string;
    issuanceDate: Timestamp;
    quantity: number;
    station: string;
    chargeInvoice: string;
    invoiceDate: Timestamp;
  } | null;
  
  // Receipt Submission ⭐ UPDATED - Base64 instead of URL
  chargeInvoiceNumber: string | null;
  chargeInvoiceDate: Timestamp | null;
  receiptBase64: string | null;     // ⭐ NEW: "data:image/jpeg;base64,/9j/4AA..."
  refuelDate: Timestamp | null;
  odometerAtRefuel: number | null;
  
  // Image Archive Status ⭐ NEW
  imageArchivedAt: Timestamp | null; // When image was archived/deleted
  
  // Receipt Verification
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: Timestamp | null;
  verificationRemarks: string | null;
  
  // Metadata
  createdBy: string;
  createdByName: string;
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 6. `contract_transactions`
```typescript
{
  id: string;
  contractId: string;
  requisitionId: string | null;     // null for INITIAL or manual ADJUSTMENT
  risNumber: string | null;
  transactionType: "INITIAL" | "DEDUCTION" | "ADJUSTMENT";
  amount: number;                   // PESO amount
  liters: number | null;            // For deductions
  pricePerLiter: number | null;     // For deductions
  balanceBefore: number;
  balanceAfter: number;
  remarks: string | null;
  createdBy: string;
  createdByName: string;
  organizationId: string;
  createdAt: Timestamp;
}
```

#### 7. `receipt_archives` ⭐ NEW
```typescript
{
  id: string;
  archiveDate: Timestamp;
  periodStart: Timestamp;           // Start of archived period
  periodEnd: Timestamp;             // End of archived period
  receiptCount: number;             // Number of receipts archived
  totalSizeKB: number;              // Approximate size of archived images
  archivedBy: string;               // Admin user ID
  archivedByName: string;
  organizationId: string;
  createdAt: Timestamp;
}
```

#### 8. `counters` ⭐ NEW
```typescript
// Document ID: fuel_requisition_ref
{
  lastNumber: number;               // Last used reference number (1, 2, 3...)
  updatedAt: Timestamp;             // When last updated
}
```

**Purpose:** Auto-increment counter for fuel requisition reference numbers.

**Display Format:**
- Stored: `1`, `2`, `3`, etc.
- Display: `FR-000001`, `FR-000002`, `FR-000003`, etc.
- Logic: `"FR-" + String(refNumber).padStart(6, '0')`

**Firestore Rules:**
```javascript
match /counters/{counterId} {
  allow read: if isActiveUser();
  allow write: if isActiveUser();
}
```

---

## Recent Feature Additions (v2.3)

### 1. Autocomplete for Destination and Purpose

**Problem:** Drivers waste time typing the same destinations and purposes repeatedly.

**Solution:** Auto-suggest previously used values from driver's own fuel requests.

**Implementation:**
- Loads last 50 fuel requisitions for logged-in driver
- Extracts unique destinations
- Extracts individual purpose lines (split by `\n`)
- Displays dropdown on field focus
- Click to auto-fill

**Code Location:** [FuelRequestForm.tsx](../src/features/fuel-requisition/components/FuelRequestForm.tsx)
- Lines 105-108: State variables
- Lines 223-259: useEffect to load previous data
- Lines 513-546: Destination autocomplete dropdown
- Lines 547-638: Purpose autocomplete dropdown

**Query Optimization:**
```typescript
// ✅ No orderBy to avoid composite index requirement
const q = query(
  collection(db, 'fuel_requisitions'),
  where('createdBy', '==', user.id),
  where('organizationId', '==', user.organizationId),
  limit(50)
);
```

**UI Pattern:**
- Dropdown appears on `onFocus`
- Dropdown hides on `onBlur` with 200ms timeout (allows click to register)
- Absolute positioning with `z-10`
- Header labels: "Recent Destinations" / "Recent Purposes"

---

### 2. Sequential Reference Numbers (FR-XXXXXX)

**Problem:** Timestamp-based reference numbers are too long and hard to reference.

**Solution:** Simple auto-increment counter with formatted display.

**Format:**
- **Stored in DB:** Plain number (1, 2, 3, 4...)
- **Display:** `FR-000001`, `FR-000002`, `FR-000003`, etc.

**Implementation:**
```typescript
// Generate reference number
const counterRef = doc(db, 'counters', 'fuel_requisition_ref');
const counterSnap = await getDoc(counterRef);

let newRefNumber = 1;
if (counterSnap.exists()) {
  newRefNumber = (counterSnap.data().lastNumber || 0) + 1;
}

// Update counter
await setDoc(counterRef, {
  lastNumber: newRefNumber,
  updatedAt: serverTimestamp()
});

// Display format
const displayRef = "FR-" + String(newRefNumber).padStart(6, '0');
// newRefNumber=1 → "FR-000001"
// newRefNumber=42 → "FR-000042"
// newRefNumber=8225 → "FR-008225"
```

**Code Location:**
- [FuelRequisitionsPage.tsx](../src/pages/FuelRequisitionsPage.tsx) lines 196-215: Reference number generation
- [FuelRequestList.tsx](../src/features/fuel-requisition/components/FuelRequestList.tsx) lines 154-156, 210-212: Display format

**Firestore Rules Required:**
- Added `counters` collection permissions in [firestore.rules](../firestore.rules) lines 131-135
- **Deployment needed:** Run `firebase deploy --only firestore:rules`

---

### 3. Purpose Display with Semicolons

**Problem:** Multi-line purposes hard to read in details view.

**Solution:** Display purposes separated by semicolons for clarity.

**Before:**
```
Purpose:
To attend Meeting
Conduct Inspection
```

**After:**
```
Purpose: To attend Meeting; Conduct Inspection
```

**Implementation:**
```typescript
{requisition.purpose?.split('\n').filter((p: string) => p.trim()).join('; ') || '—'}
```

**Code Location:** [FuelRequisitionDetails.tsx](../src/features/fuel-requisition/components/FuelRequisitionDetails.tsx) lines 132-137

---

## File Structure

### New Files to Create

```
src/
├── types/
│   └── index.ts                          # ADD: Fuel requisition types
│
├── lib/
│   ├── db.ts                             # UPDATE: Add new collections
│   ├── permissions.ts                    # UPDATE: Add fuel requisition permissions
│   ├── image-utils.ts                    # ⭐ NEW: Image compression & Base64
│   └── archive-utils.ts                  # ⭐ NEW: ZIP generation for archive
│
├── features/
│   └── fuel-requisition/                 # NEW FOLDER
│       ├── components/
│       │   ├── FuelRequisitionDetails.tsx # ⭐ NEW: Details view for a requisition
│       │   ├── FuelRequestForm.tsx       # Driver creates request
│       │   ├── FuelRequestList.tsx       # List with filters
│       │   ├── FuelValidationForm.tsx    # EMD validates
│       │   ├── FuelIssuanceForm.tsx      # SPMS issues RIS
│       │   ├── ReceiptSubmissionForm.tsx # Driver submits receipt (Base64)
│       │   ├── ReceiptVerificationForm.tsx # EMD verifies
│       │   ├── ContractSelector.tsx      # Contract dropdown with balance
│       │   ├── FuelPriceDisplay.tsx      # Current prices
│       │   └── PrintableRIS.tsx          # Print-ready RIS form
│       │
│       ├── hooks/
│       │   ├── useFuelRequisitions.ts    # Fetch/filter requisitions
│       │   ├── useContracts.ts           # Contract operations
│       │   ├── useFuelPrices.ts          # Price management
│       │   └── useLastIssuance.ts        # Get last issuance for vehicle
│       │
│       └── services/
│           ├── fuelRequisitionService.ts # CRUD + status transitions
│           ├── contractService.ts        # Contract + deduction logic
│           └── fuelPriceService.ts       # Price management
│
├── pages/
│   ├── FuelRequisitionsPage.tsx          # NEW: Main fuel page (role-based views)
│   ├── SuppliersPage.tsx                 # NEW: Admin manages suppliers
│   ├── ContractsPage.tsx                 # NEW: Admin/SPMS manages contracts
│   ├── FuelPricesPage.tsx                # NEW: SPMS updates prices
│   ├── MasterDataPage.tsx                # UPDATE: Add Issuance Signatory tab
│   └── admin/
│       └── ReceiptArchivePage.tsx        # ⭐ NEW: Admin archives receipts
│
├── components/
│   └── layout/
│       └── Sidebar.tsx                   # UPDATE: Add fuel menu items
│
└── App.tsx                               # UPDATE: Add new routes
```

---

## UI Screens Breakdown ⭐ UPDATED

### Fuel Requisitions Page (Tab-Based Layout)

**Design Pattern:** Matches TripTicketsPage for consistency across the system.

- **Hero Header Section:**
  - Emerald gradient background (`from-emerald-500 via-teal-600 to-cyan-700`)
  - Organization name display (DPWH Regional Office II)
  - Page title: "Fuel Requisition Workspace"
  - User display name with icon
  - Tab navigation buttons integrated in header (active tab = white bg, inactive = transparent with white border)

- **Role-Based Tabs:**
  | Role | Available Tabs |
  |------|----------------|
  | Driver | Create Request, My Requests |
  | EMD | Pending Validation, Pending Verification |
  | SPMS | Pending Issuance, All Requests |
  | Admin | All 6 tabs (full access) |

- **Content Area (Full Width):**
  - **Create Request Tab:** Shows `FuelRequestForm` component
  - **List Tabs (My Requests, All Requests):** Shows `FuelRequestList` with view/cancel actions
  - **Pending Validation Tab:** Shows request list; clicking View opens `FuelValidationForm`
  - **Pending Verification Tab:** Shows request list; clicking View opens `ReceiptVerificationForm`
  - **Pending Issuance Tab:** Shows request list; clicking View opens `FuelIssuanceForm`

- **State Management:**
  - `selectedRequisition` tracks which request is being viewed/edited
  - Back button returns to list view
  - Auto-refresh after form submissions

---
