# Fuel Requisition Module - Implementation Checklist
## DPWH Fleet Management System

---

## Quick Reference

**Start Date:** _______________  
**Target Completion:** _______________  
**Developer:** _______________

---

## Phase 1: Foundation (Day 1-2)

### 1.1 Types
- [ ] Open `src/types/index.ts`
- [ ] Add `FuelRequisitionStatus` type
- [ ] Add `ContractStatus` type
- [ ] Add `ContractTransactionType` type
- [ ] Add `Supplier` interface
- [ ] Add `Contract` interface
- [ ] Add `FuelPrice` interface
- [ ] Add `FuelRequisition` interface
- [ ] Add `ContractTransaction` interface
- [ ] Add `OrganizationSettings` interface
- [ ] Add `FuelRequestFormData` interface

### 1.2 Database Collections
- [ ] Open `src/lib/db.ts`
- [ ] Add `organizationSettings` collection reference
- [ ] Add `suppliers` collection reference
- [ ] Add `contracts` collection reference
- [ ] Add `fuelPrices` collection reference
- [ ] Add `fuelRequisitions` collection reference
- [ ] Add `contractTransactions` collection reference

### 1.3 Permissions
- [ ] Open `src/lib/permissions.ts`
- [ ] Add `FuelRequisitionAction` type
- [ ] Add `FUEL_REQUISITION_PERMISSIONS` matrix
- [ ] Add `canPerformFuelAction()` function

### 1.4 Firestore Setup
- [ ] Create `organization_settings` collection in Firebase Console
- [ ] Create `suppliers` collection
- [ ] Create `contracts` collection
- [ ] Create `fuel_prices` collection
- [ ] Create `fuel_requisitions` collection
- [ ] Create `contract_transactions` collection
- [ ] Update Firestore security rules

---

## Phase 2: Admin Module (Day 3-4)

### 2.1 Issuance Signatory Tab
- [ ] Open `src/pages/MasterDataPage.tsx`
- [ ] Add `'issuance'` to `activeTab` state type
- [ ] Add 4th tab button "Issuance Signatory"
- [ ] Create issuance signatory form
- [ ] Load current setting from `organization_settings`
- [ ] Save setting to `organization_settings/{orgId}`

### 2.2 Suppliers Page
- [ ] Create `src/pages/SuppliersPage.tsx`
- [ ] Add supplier form with validation
- [ ] Add suppliers list table
- [ ] Implement CRUD operations
- [ ] Add status toggle (Active/Inactive)

### 2.3 Contracts Page
- [ ] Create `src/pages/ContractsPage.tsx`
- [ ] Add contract form (contractNumber, supplier, totalAmount, startDate)
- [ ] Add contracts list with balance indicators
- [ ] Color-code by balance percentage
- [ ] Add transaction history view
- [ ] Add manual adjustment feature

---

## Phase 3: SPMS Module (Day 5-6)

### 3.1 Fuel Prices Page
- [ ] Create `src/pages/FuelPricesPage.tsx`
- [ ] Display current prices (Diesel, Gasoline, Premium)
- [ ] Add price update form
- [ ] Default effective date to next Tuesday
- [ ] Add price history table
- [ ] Mark `isCurrent: true` for latest price per fuel type

### 3.2 Features Folder Setup
- [ ] Create `src/features/fuel-requisition/` folder
- [ ] Create `src/features/fuel-requisition/components/` folder
- [ ] Create `src/features/fuel-requisition/hooks/` folder
- [ ] Create `src/features/fuel-requisition/services/` folder

### 3.3 RIS Issuance Component
- [ ] Create `FuelIssuanceForm.tsx`
- [ ] Show request details
- [ ] Show contract balance with warning if low
- [ ] Implement RIS number generation
- [ ] Auto-fill issuance signatory from org settings
- [ ] Issue RIS button → updates status

### 3.4 Printable RIS
- [ ] Create `PrintableRIS.tsx`
- [ ] Match government form layout
- [ ] Include all signatory fields
- [ ] Include last issuance info
- [ ] Print-friendly CSS

---

## Phase 4: EMD Module (Day 7-8)

### 4.1 Contract Selector Component
- [ ] Create `ContractSelector.tsx`
- [ ] Fetch active contracts for supplier
- [ ] Sort by remaining balance (low first)
- [ ] Show balance and estimated liters
- [ ] Highlight insufficient balance

### 4.2 Validation Form
- [ ] Create `FuelValidationForm.tsx`
- [ ] Show request details
- [ ] Contract selector dropdown
- [ ] Valid Until date picker
- [ ] Validated Liters input (can adjust)
- [ ] Remarks textarea
- [ ] Approve / Return / Reject buttons

### 4.3 Receipt Verification Form
- [ ] Create `ReceiptVerificationForm.tsx`
- [ ] Display receipt image
- [ ] Side-by-side RIS vs Invoice comparison
- [ ] Verification checklist
- [ ] Remarks textarea
- [ ] Verify & Complete button

### 4.4 Contract Deduction Service
- [ ] Create `contractService.ts`
- [ ] Implement `deductFromContract()` function
- [ ] Create transaction record
- [ ] Update contract balance
- [ ] Auto-mark EXHAUSTED if balance ≤ 0

---

## Phase 5: Driver Module (Day 9-10)

### 5.1 Fuel Request Form
- [ ] Create `FuelRequestForm.tsx`
- [ ] Office dropdown → auto-fill signatories
- [ ] Vehicle dropdown (DPWH Number) → auto-fill fuel type
- [ ] Supplier dropdown
- [ ] Show Last Issuance info (read-only)
- [ ] Trip details inputs
- [ ] Requested liters input
- [ ] Submit button

### 5.2 Fuel Request List
- [ ] Create `FuelRequestList.tsx`
- [ ] Filter by status
- [ ] Show: Date, Vehicle, Supplier, Liters, Status
- [ ] Action buttons per status

### 5.3 Receipt Submission Form
- [ ] Create `ReceiptSubmissionForm.tsx`
- [ ] Show RIS summary
- [ ] File upload for receipt image
- [ ] Charge Invoice Number input
- [ ] Charge Invoice Date picker
- [ ] Actual Liters Received input
- [ ] Odometer at Refuel input
- [ ] Submit button

### 5.4 Last Issuance Hook
- [ ] Create `useLastIssuance.ts`
- [ ] Query last COMPLETED request for vehicle
- [ ] Return formatted last issuance data

---

## Phase 6: Main Page & Routes (Day 11)

### 6.1 Main Fuel Requisitions Page
- [ ] Create `src/pages/FuelRequisitionsPage.tsx`
- [ ] Role-based view:
  - Driver: My Requests + Create Form
  - EMD: Pending Validations + Pending Verifications
  - SPMS: Pending Issuances + Issued RIS
  - Admin: All views

### 6.2 Routes
- [ ] Open `src/App.tsx`
- [ ] Import all new pages
- [ ] Add `/fuel-requisitions` route
- [ ] Add `/suppliers` route
- [ ] Add `/contracts` route
- [ ] Add `/fuel-prices` route

### 6.3 Sidebar Navigation
- [ ] Open `src/components/layout/Sidebar.tsx`
- [ ] Import `Fuel`, `Building2`, `FileContract`, `DollarSign` icons
- [ ] Add Fuel Requisitions menu item
- [ ] Add Suppliers menu item (admin only)
- [ ] Add Contracts menu item (admin, spms)
- [ ] Add Fuel Prices menu item (admin, spms)

---

## Phase 7: Testing (Day 12-14)

### 7.1 Workflow Testing
- [ ] Test: Driver creates request → status = PENDING_EMD
- [ ] Test: EMD validates → status = EMD_VALIDATED
- [ ] Test: SPMS issues RIS → status = RIS_ISSUED, risNumber generated
- [ ] Test: Driver submits receipt → status = RECEIPT_SUBMITTED
- [ ] Test: EMD verifies → status = COMPLETED, contract deducted

### 7.2 Business Logic Testing
- [ ] Test: RIS number format is correct (YYYY-MM-XXXX)
- [ ] Test: RIS number increments properly
- [ ] Test: Contract deduction calculation is correct
- [ ] Test: Contract auto-marks EXHAUSTED when balance ≤ 0
- [ ] Test: Last issuance populates correctly
- [ ] Test: Price at issuance vs price at purchase tracked correctly

### 7.3 Edge Cases
- [ ] Test: Insufficient contract balance warning
- [ ] Test: Contract selector prioritizes low-balance
- [ ] Test: Driver receives less than approved (actual < validated)
- [ ] Test: Cancel request before RIS issued
- [ ] Test: Multiple contracts per supplier (only one active)

### 7.4 UI Testing
- [ ] Test: Mobile responsive
- [ ] Test: Printable RIS looks correct
- [ ] Test: All forms validate properly
- [ ] Test: Loading states work
- [ ] Test: Error messages display

---

## Post-Implementation

### Documentation
- [ ] Update README with new features
- [ ] Document API/service functions
- [ ] Create user guide for each role

### Deployment
- [ ] Backup existing Firestore data
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for errors

---

## File Summary

### New Files to Create
```
src/
├── pages/
│   ├── FuelRequisitionsPage.tsx
│   ├── SuppliersPage.tsx
│   ├── ContractsPage.tsx
│   └── FuelPricesPage.tsx
│
└── features/fuel-requisition/
    ├── components/
    │   ├── FuelRequestForm.tsx
    │   ├── FuelRequestList.tsx
    │   ├── FuelValidationForm.tsx
    │   ├── FuelIssuanceForm.tsx
    │   ├── ReceiptSubmissionForm.tsx
    │   ├── ReceiptVerificationForm.tsx
    │   ├── ContractSelector.tsx
    │   ├── FuelPriceDisplay.tsx
    │   └── PrintableRIS.tsx
    │
    ├── hooks/
    │   ├── useFuelRequisitions.ts
    │   ├── useContracts.ts
    │   ├── useFuelPrices.ts
    │   └── useLastIssuance.ts
    │
    └── services/
        ├── fuelRequisitionService.ts
        ├── contractService.ts
        └── fuelPriceService.ts
```

### Files to Modify
```
src/
├── types/index.ts          # Add fuel types
├── lib/db.ts               # Add collections
├── lib/permissions.ts      # Add fuel permissions
├── App.tsx                 # Add routes
├── components/layout/Sidebar.tsx  # Add menu items
└── pages/MasterDataPage.tsx      # Add Issuance Signatory tab
```

---

## Progress Tracker

| Phase | Status | Start Date | End Date | Notes |
|-------|--------|------------|----------|-------|
| Phase 1: Foundation | ⬜ Not Started | | | |
| Phase 2: Admin Module | ⬜ Not Started | | | |
| Phase 3: SPMS Module | ⬜ Not Started | | | |
| Phase 4: EMD Module | ⬜ Not Started | | | |
| Phase 5: Driver Module | ⬜ Not Started | | | |
| Phase 6: Main Page | ⬜ Not Started | | | |
| Phase 7: Testing | ⬜ Not Started | | | |

**Legend:** ⬜ Not Started | 🟡 In Progress | ✅ Completed | ❌ Blocked

---

## Questions / Blockers

| Date | Question/Blocker | Resolution |
|------|------------------|------------|
| | | |
| | | |
| | | |
