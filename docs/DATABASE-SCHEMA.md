# Database Schema

Reference of primary Firestore collections and key fields (strings unless noted).

## Collections

### `fuel_requisitions`
- `officeId`, `officeName`
- `requestingOfficerId`, `requestingOfficerName`, `requestingOfficerPosition`
- `approvingAuthorityId`, `approvingAuthorityName`, `approvingAuthorityPosition`, `authorityPrefix`
- `vehicleId`, `dpwhNumber`, `vehicleDescription`, `plateNumber`, `fuelType`
- `driverId`, `driverName`
- `passengers`
- `inclusiveDateFrom` (Timestamp), `inclusiveDateTo` (Timestamp)
- `destination`, `purpose`
- `requestedLiters` (number), `validatedLiters` (number|null), `actualLiters` (number|null)
- `contractId`, `contractNumber`
- `supplierId`, `supplierName`
- `priceAtIssuance` (number|null), `priceAtPurchase` (number|null), `totalAmount` (number|null)
- `status` (string enum)
- `risNumber`, `refNumber`
- `validUntil` (Timestamp|null)
- `emdValidatedBy`, `emdValidatedByName`, `emdValidatedAt` (Timestamp|null), `emdRemarks`
- `issuedBy`, `issuedByName`, `issuedAt` (Timestamp|null)
- `chargeInvoiceNumber`, `chargeInvoiceDate` (Timestamp|null), `refuelDate` (Timestamp|null), `odometerAtRefuel` (number|null), `receiptImageBase64`
- `verifiedBy`, `verifiedByName`, `verifiedAt` (Timestamp|null), `verificationRemarks`
- `voidedAt` (Timestamp|null), `voidedBy`, `voidedByName`, `voidReason`
- Audit: `createdBy`, `createdByName`, `organizationId`, `createdAt` (Timestamp), `updatedAt` (Timestamp), `lastEditedAt`, `lastEditedBy`, `lastEditedByName`, `editCount`, `emdLastEditedAt`, `receiptLastEditedAt`, `receiptReturnedAt`

### `vehicles`
- `dpwhNumber`, `brand`, `model`, `plateNumber`
- `year` (number|null)
- `fuelType` (enum: Diesel/Gasoline/Electric/Hybrid)
- `status` (enum: Active/Under Maintenance/Retired)
- `organizationId`
- Audit: `createdAt`, `updatedAt`, `isActive`

### `suppliers`
- `name`, `address`, `contactPerson` (optional), `contactNumber` (optional)
- `status` (enum: ACTIVE/INACTIVE)
- `organizationId`
- Audit: `createdAt`, `updatedAt`

### `contracts`
- `contractNumber` (YYGBNNN)
- `supplierId`, `supplierName`
- `totalAmount` (number), `remainingBalance` (number)
- `startDate` (Timestamp|null), `exhaustedAt` (Timestamp|null)
- `status` (enum: ACTIVE/EXHAUSTED)
- `organizationId`
- Audit: `createdAt`, `updatedAt`

### `contract_transactions`
- `contractId`, `requisitionId` (nullable), `risNumber` (nullable)
- `transactionType` (INITIAL/DEDUCTION/ADJUSTMENT)
- `amount` (number), `liters` (number|null), `pricePerLiter` (number|null)
- `balanceBefore` (number), `balanceAfter` (number)
- `remarks` (string|null)
- `createdBy`, `createdByName`, `organizationId`
- `createdAt` (Timestamp)

### `trip_tickets`
- `vehicleId`, `vehicleLabel`
- `divisionOffice`
- `destination`, `purposes`
- `periodCoveredFrom` (Timestamp), `periodCoveredTo` (Timestamp)
- `passengers` (array of strings)
- `approvingAuthorityId`, `authorityPrefix`
- `recommendingOfficerId`
- `driverId`, `driverName`
- `status`
- Audit: `createdAt`, `updatedAt`, `organizationId`

### `offices`
- `code`, `name`, `signatoryId`, `organizationId`

### `signatories` / `approving_authorities`
- `name`, `position`, `prefix` (for authorities), `officerId` (for authorities), `organizationId`

## Index Notes
- Common compound filters:
  - `fuel_requisitions`: `status + organizationId + createdAt` (asc/desc)
  - `vehicles`: `organizationId + status`
  - `suppliers`: `organizationId + status`
  - `contracts`: `organizationId`
  - `contract_transactions`: `contractId`

## Timestamps
- Prefer `Timestamp` from Firebase server for all date fields; convert with `.toDate()` when hydrating into JS.
