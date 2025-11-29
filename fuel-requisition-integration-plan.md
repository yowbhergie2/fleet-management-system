# Fuel Requisition Module - Integration Plan
## DPWH Regional Office II - Fleet Management System

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Roles](#system-roles)
3. [Workflow Diagram](#workflow-diagram)
4. [Status Flow](#status-flow)
5. [Database Schema](#database-schema)
6. [File Structure](#file-structure)
7. [Integration Checklist](#integration-checklist)
8. [Detailed TODO](#detailed-todo)
9. [Code Patterns](#code-patterns)
10. [UI Screens Breakdown](#ui-screens-breakdown)
11. [Business Logic](#business-logic)
12. [Printable RIS Template](#printable-ris-template)

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

---

## System Roles

| Role | Existing? | Fuel Requisition Responsibilities |
|------|-----------|----------------------------------|
| `admin` | ✅ Yes | Full access, system config, issuance signatory setup |
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
| 6 | Driver | Uploads receipt, enters actual liters | Status → `RECEIPT_SUBMITTED` |
| 7 | EMD Staff | Verifies receipt matches RIS | Status → `COMPLETED`, contract deducted |

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
  isCurrent: boolean;               // true for latest price
  updatedBy: string;                // User ID (SPMS Staff)
  updatedByName: string;
  organizationId: string;
  createdAt: Timestamp;
}
```

#### 5. `fuel_requisitions`
```typescript
{
  id: string;
  
  // RIS Number (generated when issued)
  risNumber: string | null;         // "2025-11-8225"
  refNumber: number | null;         // 8225 (for auto-increment)
  
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
  
  // Receipt Submission
  chargeInvoiceNumber: string | null;
  chargeInvoiceDate: Timestamp | null;
  receiptUrl: string | null;        // Firebase Storage URL
  refuelDate: Timestamp | null;
  odometerAtRefuel: number | null;
  
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
│   └── permissions.ts                    # UPDATE: Add fuel requisition permissions
│
├── features/
│   └── fuel-requisition/                 # NEW FOLDER
│       ├── components/
│       │   ├── FuelRequestForm.tsx       # Driver creates request
│       │   ├── FuelRequestList.tsx       # List with filters
│       │   ├── FuelValidationForm.tsx    # EMD validates
│       │   ├── FuelIssuanceForm.tsx      # SPMS issues RIS
│       │   ├── ReceiptSubmissionForm.tsx # Driver submits receipt
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
│   └── MasterDataPage.tsx                # UPDATE: Add Issuance Signatory tab
│
├── components/
│   └── layout/
│       └── Sidebar.tsx                   # UPDATE: Add fuel menu items
│
└── App.tsx                               # UPDATE: Add new routes
```

---

## Integration Checklist

### Phase 1: Foundation (Database & Types)
- [ ] Update `types/index.ts` - Add fuel requisition types
- [ ] Update `lib/db.ts` - Add new collection references
- [ ] Update `lib/permissions.ts` - Add fuel requisition permissions
- [ ] Create Firestore collections (via Admin SDK or manually)
- [ ] Set up Firestore security rules

### Phase 2: Admin Module
- [ ] Update `MasterDataPage.tsx` - Add Issuance Signatory tab
- [ ] Create `SuppliersPage.tsx` - Supplier CRUD
- [ ] Create `ContractsPage.tsx` - Contract management
- [ ] Update `Sidebar.tsx` - Add Admin menu items

### Phase 3: SPMS Module  
- [ ] Create `FuelPricesPage.tsx` - Price management
- [ ] Create `FuelIssuanceForm.tsx` - Issue RIS
- [ ] Create `PrintableRIS.tsx` - Print format
- [ ] Add SPMS routes to `App.tsx`

### Phase 4: EMD Module
- [ ] Create `FuelValidationForm.tsx` - Validate requests
- [ ] Create `ContractSelector.tsx` - Smart contract selection
- [ ] Create `ReceiptVerificationForm.tsx` - Verify receipts
- [ ] Implement contract deduction logic

### Phase 5: Driver Module
- [ ] Create `FuelRequestForm.tsx` - Create requests
- [ ] Create `FuelRequestList.tsx` - View my requests
- [ ] Create `ReceiptSubmissionForm.tsx` - Submit receipts
- [ ] Implement file upload for receipts

### Phase 6: Main Page & Routes
- [ ] Create `FuelRequisitionsPage.tsx` - Role-based main page
- [ ] Update `App.tsx` - Add all routes
- [ ] Update `Sidebar.tsx` - Complete navigation

### Phase 7: Testing & Polish
- [ ] Test complete workflow (Driver → EMD → SPMS → Driver → EMD)
- [ ] Test contract deduction calculations
- [ ] Test RIS number generation
- [ ] Test printable RIS format
- [ ] Mobile responsiveness
- [ ] Error handling

---

## Detailed TODO

### 1. Types (`src/types/index.ts`)

```typescript
// ADD these types to existing file

/**
 * Fuel requisition status
 */
export type FuelRequisitionStatus =
  | 'DRAFT'
  | 'PENDING_EMD'
  | 'EMD_VALIDATED'
  | 'PENDING_ISSUANCE'
  | 'RIS_ISSUED'
  | 'AWAITING_RECEIPT'
  | 'RECEIPT_SUBMITTED'
  | 'COMPLETED'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 * Contract status
 */
export type ContractStatus = 'ACTIVE' | 'EXHAUSTED';

/**
 * Contract transaction type
 */
export type ContractTransactionType = 'INITIAL' | 'DEDUCTION' | 'ADJUSTMENT';

/**
 * Supplier interface
 */
export interface Supplier {
  id: string;
  name: string;
  address: string;
  contactPerson: string | null;
  contactNumber: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contract interface
 */
export interface Contract {
  id: string;
  contractNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  remainingBalance: number;
  startDate: Date;
  status: ContractStatus;
  exhaustedAt: Date | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fuel price interface
 */
export interface FuelPrice {
  id: string;
  fuelType: 'DIESEL' | 'GASOLINE' | 'PREMIUM';
  pricePerLiter: number;
  effectiveDate: Date;
  isCurrent: boolean;
  updatedBy: string;
  updatedByName: string;
  organizationId: string;
  createdAt: Date;
}

/**
 * Fuel requisition interface
 */
export interface FuelRequisition {
  id: string;
  risNumber: string | null;
  refNumber: number | null;
  
  // Office & Signatories
  officeId: string;
  officeName: string;
  requestingOfficerId: string;
  requestingOfficerName: string;
  requestingOfficerPosition: string;
  approvingAuthorityId: string;
  approvingAuthorityName: string;
  approvingAuthorityPosition: string;
  authorityPrefix: string;
  issuanceSignatoryId: string | null;
  issuanceSignatoryName: string | null;
  issuanceSignatoryPosition: string | null;
  
  // Vehicle & Driver
  vehicleId: string;
  dpwhNumber: string;
  vehicleDescription: string;
  plateNumber: string;
  fuelType: 'DIESEL' | 'GASOLINE' | 'PREMIUM';
  driverId: string;
  driverName: string;
  
  // Trip Details
  passengers: string;
  inclusiveDateFrom: Date;
  inclusiveDateTo: Date;
  destination: string;
  purpose: string;
  
  // Fuel Request
  requestedLiters: number;
  validatedLiters: number | null;
  actualLiters: number | null;
  
  // Contract & Pricing
  contractId: string | null;
  contractNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  priceAtIssuance: number | null;
  priceAtPurchase: number | null;
  totalAmount: number | null;
  
  // Validity
  validUntil: Date | null;
  
  // Status
  status: FuelRequisitionStatus;
  
  // EMD Validation
  emdValidatedBy: string | null;
  emdValidatedByName: string | null;
  emdValidatedAt: Date | null;
  emdRemarks: string | null;
  
  // SPMS Issuance
  issuedBy: string | null;
  issuedByName: string | null;
  issuedAt: Date | null;
  
  // Last Issuance
  lastIssuance: {
    risNumber: string;
    issuanceDate: Date;
    quantity: number;
    station: string;
    chargeInvoice: string;
    invoiceDate: Date;
  } | null;
  
  // Receipt
  chargeInvoiceNumber: string | null;
  chargeInvoiceDate: Date | null;
  receiptUrl: string | null;
  refuelDate: Date | null;
  odometerAtRefuel: number | null;
  
  // Verification
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: Date | null;
  verificationRemarks: string | null;
  
  // Metadata
  createdBy: string;
  createdByName: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contract transaction interface
 */
export interface ContractTransaction {
  id: string;
  contractId: string;
  requisitionId: string | null;
  risNumber: string | null;
  transactionType: ContractTransactionType;
  amount: number;
  liters: number | null;
  pricePerLiter: number | null;
  balanceBefore: number;
  balanceAfter: number;
  remarks: string | null;
  createdBy: string;
  createdByName: string;
  organizationId: string;
  createdAt: Date;
}

/**
 * Organization settings interface
 */
export interface OrganizationSettings {
  organizationId: string;
  issuanceSignatoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating fuel request
 */
export interface FuelRequestFormData {
  officeId: string;
  vehicleId: string;
  supplierId: string;
  passengers: string;
  inclusiveDateFrom: string;
  inclusiveDateTo: string;
  destination: string;
  purpose: string;
  requestedLiters: number;
}
```

### 2. Database Collections (`src/lib/db.ts`)

```typescript
// ADD to existing collections object
export const collections = {
  // ... existing collections
  users: collection(db, 'users'),
  organizations: collection(db, 'organizations'),
  vehicles: collection(db, 'vehicles'),
  tripTickets: collection(db, 'trip_tickets'),
  signatories: collection(db, 'signatories'),
  offices: collection(db, 'offices'),
  approvingAuthorities: collection(db, 'approving_authorities'),
  
  // NEW collections for Fuel Requisition
  organizationSettings: collection(db, 'organization_settings'),
  suppliers: collection(db, 'suppliers'),
  contracts: collection(db, 'contracts'),
  fuelPrices: collection(db, 'fuel_prices'),
  fuelRequisitions: collection(db, 'fuel_requisitions'),
  contractTransactions: collection(db, 'contract_transactions'),
};
```

### 3. Permissions (`src/lib/permissions.ts`)

```typescript
// ADD to existing permissions file

/**
 * Permission actions for fuel requisitions
 */
export type FuelRequisitionAction =
  | 'create_request'
  | 'view_own_requests'
  | 'view_all_requests'
  | 'validate_request'
  | 'issue_ris'
  | 'submit_receipt'
  | 'verify_receipt'
  | 'manage_suppliers'
  | 'manage_contracts'
  | 'manage_prices'
  | 'print_ris'
  | 'cancel_request';

/**
 * RBAC Permission Matrix for Fuel Requisitions
 */
const FUEL_REQUISITION_PERMISSIONS: Record<UserRole, FuelRequisitionAction[]> = {
  driver: [
    'create_request',
    'view_own_requests',
    'submit_receipt',
    'print_ris',
    'cancel_request',
  ],
  emd: [
    'view_all_requests',
    'validate_request',
    'verify_receipt',
  ],
  spms: [
    'view_all_requests',
    'issue_ris',
    'manage_contracts',
    'manage_prices',
    'print_ris',
  ],
  admin: [
    'create_request',
    'view_own_requests',
    'view_all_requests',
    'validate_request',
    'issue_ris',
    'submit_receipt',
    'verify_receipt',
    'manage_suppliers',
    'manage_contracts',
    'manage_prices',
    'print_ris',
    'cancel_request',
  ],
};

/**
 * Check if user has fuel requisition permission
 */
export function canPerformFuelAction(
  user: User | null,
  action: FuelRequisitionAction
): boolean {
  if (!user || !user.isActive) return false;
  return FUEL_REQUISITION_PERMISSIONS[user.role]?.includes(action) ?? false;
}
```

### 4. Sidebar Navigation (`src/components/layout/Sidebar.tsx`)

```typescript
// UPDATE menuItems array
const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'driver', 'spms', 'emd'] },
  { icon: FileText, label: 'Trip Tickets', path: '/trip-tickets', roles: ['admin', 'driver', 'spms'] },
  
  // NEW: Fuel Requisition menu items
  { icon: Fuel, label: 'Fuel Requisitions', path: '/fuel-requisitions', roles: ['admin', 'driver', 'spms', 'emd'] },
  { icon: Building2, label: 'Suppliers', path: '/suppliers', roles: ['admin'] },
  { icon: FileContract, label: 'Contracts', path: '/contracts', roles: ['admin', 'spms'] },
  { icon: DollarSign, label: 'Fuel Prices', path: '/fuel-prices', roles: ['admin', 'spms'] },
  
  // Existing
  { icon: Truck, label: 'Vehicles', path: '/vehicles', roles: ['admin'] },
  { icon: Database, label: 'Master Data', path: '/master-data', roles: ['admin'] },
  { icon: Users, label: 'Users', path: '/admin/users', roles: ['admin'] },
];
```

### 5. Routes (`src/App.tsx`)

```typescript
// ADD new routes inside <Routes>

{/* Fuel Requisition Module */}
<Route
  path="/fuel-requisitions"
  element={
    <ProtectedRoute allowedRoles={['admin', 'driver', 'spms', 'emd']}>
      <FuelRequisitionsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/suppliers"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <SuppliersPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/contracts"
  element={
    <ProtectedRoute allowedRoles={['admin', 'spms']}>
      <ContractsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/fuel-prices"
  element={
    <ProtectedRoute allowedRoles={['admin', 'spms']}>
      <FuelPricesPage />
    </ProtectedRoute>
  }
/>
```

---

## Code Patterns

### Pattern 1: Page Structure (following VehiclesPage.tsx)

```typescript
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';

// Schema
const formSchema = z.object({
  // fields
});

export function ExamplePage() {
  const user = useUser();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState(null);

  // Load data
  const loadData = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'collection_name'),
        where('organizationId', '==', user.organizationId)
      );
      const snap = await getDocs(q);
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setModal({ type: 'error', title: 'Error', description: 'Failed to load data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.organizationId]);

  return (
    <DashboardLayout>
      {/* Content */}
    </DashboardLayout>
  );
}
```

### Pattern 2: Form with Zod Validation

```typescript
const fuelRequestSchema = z.object({
  officeId: z.string().min(1, 'Office is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  passengers: z.string().min(1, 'Passengers are required'),
  inclusiveDateFrom: z.string().min(1, 'Start date is required'),
  inclusiveDateTo: z.string().min(1, 'End date is required'),
  destination: z.string().min(1, 'Destination is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  requestedLiters: z.number().min(1, 'Liters must be at least 1'),
});

const { register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(fuelRequestSchema),
});
```

### Pattern 3: Modal Confirmation

```typescript
const [modal, setModal] = useState<{
  type: 'success' | 'error' | 'confirm';
  title: string;
  description: string;
  onConfirm?: () => Promise<void>;
} | null>(null);

// Usage
setModal({
  type: 'confirm',
  title: 'Delete Item',
  description: 'Are you sure?',
  onConfirm: async () => {
    await deleteDoc(doc(db, 'collection', id));
    loadData();
  },
});
```

---

## UI Screens Breakdown

### Driver Screens

#### 1. Create Fuel Request
- Office dropdown → auto-fills Requesting Officer & Approving Authority
- Vehicle dropdown (shows DPWH Number) → auto-fills fuel type
- Last Issuance info (read-only, from previous completed request)
- Supplier dropdown
- Trip details: passengers, dates, destination, purpose
- Requested liters input

#### 2. My Fuel Requests List
- Filter by status
- Show: Date, Vehicle, Supplier, Liters, Status
- Actions: View, Print RIS (if issued), Submit Receipt, Cancel

#### 3. Submit Receipt Form
- Show RIS summary
- Upload receipt image
- Charge Invoice Number, Date
- Actual Liters Received
- Odometer at Refuel

### EMD Screens

#### 1. Pending Validations List
- Show requests with status `PENDING_EMD`
- Quick info: Driver, Vehicle, Requested Liters, Date

#### 2. Validation Form
- Show request details
- Contract selector (shows balance, prioritizes low-balance)
- Valid Until date picker
- Validated Liters (can adjust)
- Remarks
- Actions: Approve, Return, Reject

#### 3. Pending Receipt Verifications
- Show requests with status `RECEIPT_SUBMITTED`
- Side-by-side: RIS vs Invoice comparison

#### 4. Receipt Verification Form
- Show receipt image
- Compare: RIS liters vs Invoice liters
- Confirm amount calculation
- Remarks
- Action: Verify & Complete → triggers contract deduction

### SPMS Screens

#### 1. Fuel Prices Management
- Current prices display (Diesel, Gasoline, Premium)
- Update form (effective date defaults to next Tuesday)
- Price history table

#### 2. Pending Issuances List
- Show requests with status `EMD_VALIDATED`
- Contract balance warning if low

#### 3. Issue RIS Form
- Show request & validation details
- Contract balance check
- Auto-generate RIS number
- Auto-fill issuance signatory
- Action: Issue RIS

#### 4. Contracts List
- Show all contracts with balance indicators
- Filter by status (Active, Exhausted)
- Transaction history per contract

### Admin Screens

#### 1. Suppliers Management
- CRUD for suppliers
- Status toggle (Active/Inactive)

#### 2. Contracts Management
- Create new contracts
- Manual balance adjustments
- Transaction history

#### 3. Issuance Signatory (MasterDataPage tab)
- Select signatory from existing signatories
- Save to organization_settings

---

## Business Logic

### 1. Contract Selection (EMD validates)

```typescript
async function getAvailableContracts(supplierId: string, organizationId: string) {
  const q = query(
    collection(db, 'contracts'),
    where('supplierId', '==', supplierId),
    where('status', '==', 'ACTIVE'),
    where('organizationId', '==', organizationId)
  );
  const snap = await getDocs(q);
  const contracts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Sort by remaining balance (low to high) - prioritize nearly exhausted
  contracts.sort((a, b) => a.remainingBalance - b.remainingBalance);
  
  return contracts;
}
```

### 2. RIS Number Generation (SPMS issues)

```typescript
async function generateRISNumber(organizationId: string): Promise<{ risNumber: string; refNumber: number }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;
  
  // Get last RIS for this month
  const q = query(
    collection(db, 'fuel_requisitions'),
    where('organizationId', '==', organizationId),
    where('risNumber', '>=', prefix),
    where('risNumber', '<=', prefix + '\uf8ff'),
    orderBy('refNumber', 'desc'),
    limit(1)
  );
  
  const snap = await getDocs(q);
  const lastRefNumber = snap.empty ? 8224 : snap.docs[0].data().refNumber; // Start from 8225
  const newRefNumber = lastRefNumber + 1;
  
  return {
    risNumber: `${prefix}-${newRefNumber}`,
    refNumber: newRefNumber,
  };
}
```

### 3. Contract Deduction (EMD verifies receipt)

```typescript
async function deductFromContract(
  requisitionId: string,
  contractId: string,
  actualLiters: number,
  priceAtPurchase: number,
  user: User
) {
  const contractRef = doc(db, 'contracts', contractId);
  const contractSnap = await getDoc(contractRef);
  const contract = contractSnap.data();
  
  const deductionAmount = actualLiters * priceAtPurchase;
  const balanceBefore = contract.remainingBalance;
  const balanceAfter = Math.max(0, balanceBefore - deductionAmount);
  
  // Create transaction record
  await addDoc(collection(db, 'contract_transactions'), {
    contractId,
    requisitionId,
    transactionType: 'DEDUCTION',
    amount: deductionAmount,
    liters: actualLiters,
    pricePerLiter: priceAtPurchase,
    balanceBefore,
    balanceAfter,
    createdBy: user.id,
    createdByName: user.displayName,
    organizationId: user.organizationId,
    createdAt: serverTimestamp(),
  });
  
  // Update contract balance
  const updateData: any = {
    remainingBalance: balanceAfter,
    updatedAt: serverTimestamp(),
  };
  
  // Auto-mark as exhausted if balance is zero
  if (balanceAfter <= 0) {
    updateData.status = 'EXHAUSTED';
    updateData.exhaustedAt = serverTimestamp();
  }
  
  await updateDoc(contractRef, updateData);
}
```

### 4. Last Issuance Auto-Population

```typescript
async function getLastIssuance(vehicleId: string, organizationId: string) {
  const q = query(
    collection(db, 'fuel_requisitions'),
    where('vehicleId', '==', vehicleId),
    where('status', '==', 'COMPLETED'),
    where('organizationId', '==', organizationId),
    orderBy('verifiedAt', 'desc'),
    limit(1)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return null;
  
  const last = snap.docs[0].data();
  return {
    risNumber: last.risNumber,
    issuanceDate: last.issuedAt,
    quantity: last.actualLiters,
    station: last.supplierName,
    chargeInvoice: last.chargeInvoiceNumber,
    invoiceDate: last.chargeInvoiceDate,
  };
}
```

---

## Printable RIS Template

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         REQUISITION AND ISSUE SLIP                              │
│                          DPWH - Regional Office II                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Division: {officeName}                              RIS No.: {risNumber}        │
│                                                     Date: {issuedAt}            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ REQUISITION                                                                     │
├───────────┬───────────┬─────────────────────────────────────┬──────────────────┤
│ Stock No. │   Unit    │           Description               │     Quantity     │
├───────────┼───────────┼─────────────────────────────────────┼──────────────────┤
│{supplier} │  Liters   │ {fuelType}                          │ {validatedLiters}│
│           │           │ Model: {vehicleDescription}         │                  │
│           │           │ Plate No.: {plateNumber}            │                  │
│           │           │ DPWH No.: {dpwhNumber}              │                  │
│           │           │ {passengers}                        │                  │
├───────────┴───────────┴─────────────────────────────────────┴──────────────────┤
│ Contract No.: {contractNumber}                                                  │
│ Total stock after issuance: ₱{remainingBalance} (~{estimatedLiters} L)         │
│ Valid for issuance until: {validUntil}                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ PURPOSE: {purpose}                                                              │
│ INCLUSIVE DATES: {inclusiveDateFrom} to {inclusiveDateTo}                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ LAST ISSUANCE:                                                                  │
│ RIS No: {lastIssuance.risNumber}  Date: {lastIssuance.issuanceDate}            │
│ Qty: {lastIssuance.quantity}L     Station: {lastIssuance.station}              │
│ Charge Invoice: {lastIssuance.chargeInvoice}  Date: {lastIssuance.invoiceDate} │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              SIGNATURES                                          │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────┤
│ Checked as to   │   Issued by:    │  Requested by:  │      Approved by:         │
│    quantity:    │                 │                 │                           │
│                 │                 │                 │  {authorityPrefix}        │
│                 │                 │                 │                           │
│ ____________    │  ____________   │  ____________   │     ____________          │
│{emdValidatedBy} │{issuanceSig}    │{requestingOff}  │  {approvingAuthority}     │
│ EMD Staff       │{issuanceSigPos} │{reqOffPosition} │  {appAuthPosition}        │
├─────────────────┴─────────────────┴─────────────────┴───────────────────────────┤
│                           Received by:                                           │
│                                                                                  │
│                           _____________________                                  │
│                           {driverName}                                           │
│                           Driver                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Price changes between request and purchase | Track both `priceAtIssuance` and `priceAtPurchase`, deduct using actual |
| Insufficient contract balance | EMD sees warning, can reduce qty or select different contract |
| Contract nearly exhausted | System auto-prioritizes low-balance contracts in selector |
| Driver receives less than approved | Enter actual liters, only actual amount deducted |
| RIS validity expired | System shows warning, EMD can still verify with remarks |
| Request cancellation | Can cancel before RIS_ISSUED, SPMS can void after issuance |
| Multiple contracts per supplier | Only one ACTIVE at a time, consume low-balance first |

---

## Final Checklist

Before deployment:

- [ ] All 6 new collections created in Firestore
- [ ] Security rules updated for new collections
- [ ] All types added to `types/index.ts`
- [ ] All permissions added to `lib/permissions.ts`
- [ ] All collections added to `lib/db.ts`
- [ ] All routes added to `App.tsx`
- [ ] Sidebar updated with new menu items
- [ ] MasterDataPage has Issuance Signatory tab
- [ ] RIS number generation tested
- [ ] Contract deduction logic tested
- [ ] Printable RIS matches government form
- [ ] Mobile responsive
- [ ] All status transitions work correctly

---

## Notes

- **Organization ID:** `org_dtt-ris`
- **Timezone:** Asia/Manila
- **Date Format:** MM/DD/YYYY
- **Price Update Schedule:** Every Tuesday
- **Vehicle Display:** DPWH Number (e.g., "H1-7110")
- **Contract Tracking:** PESO-based with LITERS estimate
- **Offline Signatures:** Requesting Officer, Approving Authority (physical paper only)
