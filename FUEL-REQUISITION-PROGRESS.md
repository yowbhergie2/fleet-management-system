# Fuel Requisition Module - Implementation Progress

**Project:** Fleet Management System - DPWH Regional Office II
**Module:** Fuel Requisition and Issue Slip (RIS) Management
**Status:** In Progress
**Started:** November 29, 2025

---

## Phase Completion Overview

- ✅ **Phase 1: Foundation** - COMPLETED
- ⏳ **Phase 2: Admin Module** - Not Started
- ⏳ **Phase 3: SPMS Module** - Not Started
- ⏳ **Phase 4: EMD Module** - Not Started
- ⏳ **Phase 5: Driver Module** - Not Started
- ⏳ **Phase 6: Main Page & Routes** - Not Started
- ⏳ **Phase 7: Testing & Polish** - Not Started

---

## Detailed Checklist

### ✅ Phase 1: Foundation (Database & Types)
- ✅ Update `types/index.ts` - Add fuel requisition types
  - ✅ FuelRequisitionStatus (11 statuses)
  - ✅ ContractStatus, ContractTransactionType
  - ✅ Supplier, Contract, FuelPrice interfaces
  - ✅ FuelRequisition interface (complete schema)
  - ✅ ContractTransaction interface
  - ✅ OrganizationSettings interface
  - ✅ FuelRequestFormData interface
- ✅ Update `lib/db.ts` - Add new collection references
  - ✅ organizationSettings
  - ✅ suppliers
  - ✅ contracts
  - ✅ fuelPrices
  - ✅ fuelRequisitions
  - ✅ contractTransactions
- ✅ Update `lib/permissions.ts` - Add fuel requisition permissions
  - ✅ FuelRequisitionAction type (11 actions)
  - ✅ RBAC permission matrix for all roles
  - ✅ canPerformFuelAction() helper function
- ✅ Update `Sidebar.tsx` - Add fuel menu items
  - ✅ Fuel Requisitions menu item (all roles)
  - ✅ Suppliers menu item (admin only)
  - ✅ Contracts menu item (admin & spms)
  - ✅ Fuel Prices menu item (admin & spms)
- ✅ Update `App.tsx` - Add fuel routes
  - ✅ /fuel-requisitions route (placeholder)
  - ✅ /suppliers route (placeholder)
  - ✅ /contracts route (placeholder)
  - ✅ /fuel-prices route (placeholder)

**Phase 1 Commit:** Ready for commit

---

### ⏳ Phase 2: Admin Module
- [ ] Update `MasterDataPage.tsx` - Add Issuance Signatory tab
- [ ] Create `SuppliersPage.tsx` - Supplier CRUD
  - [ ] Supplier form with validation
  - [ ] Supplier list with filters
  - [ ] Status toggle (Active/Inactive)
  - [ ] Edit and delete functionality
- [ ] Create `ContractsPage.tsx` - Contract management
  - [ ] Contract form (number, supplier, amount, date)
  - [ ] Contract list with balance indicators
  - [ ] Transaction history view
  - [ ] Manual balance adjustments
  - [ ] Auto-mark as exhausted when balance = 0
- [ ] Update `Sidebar.tsx` - Verify admin menu items (already done)

---

### ⏳ Phase 3: SPMS Module
- [ ] Create `FuelPricesPage.tsx` - Price management
  - [ ] Current prices display (Diesel, Gasoline, Premium)
  - [ ] Update price form (effective date = next Tuesday)
  - [ ] Price history table
  - [ ] Auto-mark previous prices as not current
- [ ] Create `FuelIssuanceForm.tsx` - Issue RIS
  - [ ] Display request & validation details
  - [ ] Contract balance check
  - [ ] Auto-generate RIS number (YYYY-MM-XXXX format)
  - [ ] Auto-fill issuance signatory
  - [ ] Update status to RIS_ISSUED
- [ ] Create `PrintableRIS.tsx` - Print format
  - [ ] Match government RIS template
  - [ ] Include all required fields
  - [ ] Signature blocks layout
  - [ ] Last issuance info display
- [ ] Add SPMS routes to `App.tsx` (already added placeholders)

---

### ⏳ Phase 4: EMD Module
- [ ] Create `FuelValidationForm.tsx` - Validate requests
  - [ ] Display request details
  - [ ] Contract selector with balance display
  - [ ] Valid Until date picker
  - [ ] Validated Liters input (adjustable)
  - [ ] Remarks field
  - [ ] Actions: Approve, Return, Reject
- [ ] Create `ContractSelector.tsx` - Smart contract selection
  - [ ] Filter by supplier
  - [ ] Show remaining balance
  - [ ] Prioritize low-balance contracts
  - [ ] Warn if insufficient balance
- [ ] Create `ReceiptVerificationForm.tsx` - Verify receipts
  - [ ] Display receipt image
  - [ ] Compare RIS vs Invoice liters
  - [ ] Amount calculation verification
  - [ ] Remarks field
  - [ ] Action: Verify & Complete
- [ ] Implement contract deduction logic
  - [ ] Calculate: actualLiters × priceAtPurchase
  - [ ] Create transaction record
  - [ ] Update contract balance
  - [ ] Auto-mark as exhausted if balance = 0

---

### ⏳ Phase 5: Driver Module
- [ ] Create `FuelRequestForm.tsx` - Create requests
  - [ ] Office dropdown (auto-fills officers)
  - [ ] Vehicle dropdown (auto-fills fuel type)
  - [ ] Last issuance display (read-only)
  - [ ] Supplier dropdown
  - [ ] Trip details inputs
  - [ ] Requested liters input
  - [ ] Submit & Save as Draft actions
- [ ] Create `FuelRequestList.tsx` - View my requests
  - [ ] Filter by status
  - [ ] Display: Date, Vehicle, Supplier, Liters, Status
  - [ ] Actions: View, Print RIS, Submit Receipt, Cancel
- [ ] Create `ReceiptSubmissionForm.tsx` - Submit receipts
  - [ ] Display RIS summary
  - [ ] Upload receipt image (Firebase Storage)
  - [ ] Charge Invoice Number & Date
  - [ ] Actual Liters Received
  - [ ] Odometer reading
  - [ ] Submit action
- [ ] Implement file upload for receipts
  - [ ] Firebase Storage integration
  - [ ] Image validation (size, format)
  - [ ] Upload progress indicator

---

### ⏳ Phase 6: Main Page & Routes
- [ ] Create `FuelRequisitionsPage.tsx` - Role-based main page
  - [ ] Driver view: Create + My Requests
  - [ ] EMD view: Pending Validations + Pending Verifications
  - [ ] SPMS view: Pending Issuances + All Requests
  - [ ] Admin view: Full access to all tabs
- [ ] Update `App.tsx` - Replace placeholders with actual pages
- [ ] Update `Sidebar.tsx` - Verify all navigation works

---

### ⏳ Phase 7: Testing & Polish
- [ ] Test complete workflow
  - [ ] Driver creates request → PENDING_EMD
  - [ ] EMD validates → EMD_VALIDATED
  - [ ] SPMS issues RIS → RIS_ISSUED
  - [ ] Driver submits receipt → RECEIPT_SUBMITTED
  - [ ] EMD verifies → COMPLETED + contract deducted
- [ ] Test contract deduction calculations
  - [ ] Verify amount = liters × price
  - [ ] Verify balance updates correctly
  - [ ] Verify auto-exhausted when balance = 0
- [ ] Test RIS number generation
  - [ ] Verify format: YYYY-MM-XXXX
  - [ ] Verify auto-increment works
  - [ ] Verify uniqueness per month
- [ ] Test printable RIS format
  - [ ] Verify matches government template
  - [ ] Verify all fields populate correctly
  - [ ] Verify signature blocks layout
- [ ] Mobile responsiveness
  - [ ] All forms work on mobile
  - [ ] Tables are scrollable
  - [ ] Buttons are touch-friendly
- [ ] Error handling
  - [ ] Network errors
  - [ ] Validation errors
  - [ ] Firebase errors
  - [ ] User-friendly error messages

---

## Database Collections Status

### Existing Collections (No changes needed)
- ✅ `signatories` - Already exists
- ✅ `offices` - Already exists
- ✅ `approving_authorities` - Already exists
- ✅ `vehicles` - Already exists
- ✅ `users` - Already exists

### New Collections (To be created in Firestore)
- ⏳ `organization_settings` - Not created
- ⏳ `suppliers` - Not created
- ⏳ `contracts` - Not created
- ⏳ `fuel_prices` - Not created
- ⏳ `fuel_requisitions` - Not created
- ⏳ `contract_transactions` - Not created

---

## Firestore Security Rules (To be updated)

```javascript
// Add to firestore.rules
match /organization_settings/{docId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /suppliers/{supplierId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /contracts/{contractId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin() || isSPMS();
}

match /fuel_prices/{priceId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin() || isSPMS();
}

match /fuel_requisitions/{requisitionId} {
  allow read: if isAuthenticated();
  allow create: if isDriver() || isAdmin();
  allow update: if canUpdateRequisition();
}

match /contract_transactions/{transactionId} {
  allow read: if isAuthenticated();
  allow write: if isEMD() || isAdmin();
}
```

---

## Next Steps

**Current Phase:** Phase 1 Complete ✅
**Next Phase:** Phase 2 - Admin Module

**Recommended Order:**
1. Create Firestore collections (manual setup via Firebase Console)
2. Update Firestore security rules
3. Implement SuppliersPage (simpler CRUD)
4. Implement ContractsPage (more complex with transactions)
5. Update MasterDataPage with Issuance Signatory tab

**Dependencies:**
- Phase 2 must complete before Phase 3 (SPMS needs contracts)
- Phase 3 must complete before Phase 4 (EMD validates before SPMS issues)
- All previous phases must complete before Phase 7 (testing)

---

## Notes

- **Organization ID:** `org_dtt-ris`
- **Timezone:** Asia/Manila
- **Date Format:** MM/DD/YYYY
- **Price Update Schedule:** Every Tuesday
- **Vehicle Display:** DPWH Number (e.g., "H1-7110")
- **Contract Tracking:** PESO-based with LITERS estimate
- **RIS Number Format:** YYYY-MM-XXXX (auto-increment)
- **Offline Signatures:** Requesting Officer, Approving Authority (physical paper only)

---

**Last Updated:** November 29, 2025
**Updated By:** Claude Code
