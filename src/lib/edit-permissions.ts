import { FuelRequisition, User, UserRole } from '@/types';

/**
 * Edit Permissions System (v2.4)
 *
 * Determines who can edit what fields at what stage of the fuel requisition workflow.
 */

/**
 * Check if driver can edit the fuel request
 * Driver can edit when:
 * - Status is PENDING_EMD or RETURNED
 * - User is the original creator
 */
export function canDriverEditRequest(
  requisition: FuelRequisition,
  user: User
): boolean {
  return (
    (requisition.status === 'PENDING_EMD' || requisition.status === 'RETURNED') &&
    requisition.createdBy === user.id
  );
}

/**
 * Check if EMD can edit validation
 * EMD can edit when:
 * - Status is EMD_VALIDATED (before SPMS issues RIS)
 * - User has EMD or Admin role
 */
export function canEMDEditValidation(
  requisition: FuelRequisition,
  user: User
): boolean {
  return (
    requisition.status === 'EMD_VALIDATED' &&
    (user.role === 'emd' || user.role === 'admin')
  );
}

/**
 * Check if driver can re-upload receipt
 * Driver can re-upload when:
 * - Status is RECEIPT_SUBMITTED or RECEIPT_RETURNED
 * - User is the original creator
 */
export function canDriverReuploadReceipt(
  requisition: FuelRequisition,
  user: User
): boolean {
  return (
    (requisition.status === 'RECEIPT_SUBMITTED' || requisition.status === 'RECEIPT_RETURNED') &&
    requisition.createdBy === user.id
  );
}

/**
 * Check if driver can submit or re-upload receipt (covers initial submission)
 */
export function canDriverSubmitOrEditReceipt(
  requisition: FuelRequisition,
  user: User
): boolean {
  if (requisition.createdBy !== user.id) return false;
  return [
    'RIS_ISSUED',
    'AWAITING_RECEIPT',
    'RECEIPT_SUBMITTED',
    'RECEIPT_RETURNED'
  ].includes(requisition.status);
}

/**
 * Check if SPMS can void RIS
 * SPMS can void when:
 * - Status is RIS_ISSUED (before driver submits receipt)
 * - User has SPMS or Admin role
 */
export function canSPMSVoidRIS(
  requisition: FuelRequisition,
  user: User
): boolean {
  return (
    requisition.status === 'RIS_ISSUED' &&
    (user.role === 'spms' || user.role === 'admin')
  );
}

/**
 * Check if EMD can return receipt
 * EMD can return when:
 * - Status is RECEIPT_SUBMITTED (driver uploaded but not yet verified)
 * - User has EMD or Admin role
 */
export function canEMDReturnReceipt(
  requisition: FuelRequisition,
  user: User
): boolean {
  return (
    requisition.status === 'RECEIPT_SUBMITTED' &&
    (user.role === 'emd' || user.role === 'admin')
  );
}

/**
 * Check if user can view/edit any requisition (admin override)
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Get editable fields for driver request edit
 * Driver can edit ALL request fields
 */
export function getDriverEditableFields(): string[] {
  return [
    'officeId',
    'officeName',
    'requestingOfficerId',
    'requestingOfficerName',
    'requestingOfficerPosition',
    'approvingAuthorityId',
    'approvingAuthorityName',
    'approvingAuthorityPosition',
    'authorityPrefix',
    'vehicleId',
    'dpwhNumber',
    'vehicleDescription',
    'plateNumber',
    'fuelType',
    'passengers',
    'destination',
    'purpose',
    'inclusiveDateFrom',
    'inclusiveDateTo',
    'requestedLiters'
  ];
}

/**
 * Get editable fields for EMD validation edit
 * EMD can edit: Contract, Validated Liters, Validity, Remarks
 */
export function getEMDEditableFields(): string[] {
  return [
    'contractId',
    'contractNumber',
    'supplierId',
    'supplierName',
    'validatedLiters',
    'validUntil',
    'emdRemarks'
  ];
}

/**
 * Get editable fields for receipt re-upload
 * Driver can edit all receipt-related fields
 */
export function getReceiptEditableFields(): string[] {
  return [
    'receiptImageBase64',
    'chargeInvoiceNumber',
    'chargeInvoiceDate',
    'actualLiters',
    'refuelDate',
    'odometerAtRefuel'
  ];
}

/**
 * Get user-friendly edit permission message
 */
export function getEditPermissionMessage(
  requisition: FuelRequisition,
  user: User
): string | null {
  if (canDriverEditRequest(requisition, user)) {
    return 'You can edit all request fields. Changes will resubmit the request for EMD validation.';
  }

  if (canEMDEditValidation(requisition, user)) {
    return 'You can edit contract assignment, validated liters, validity date, and remarks.';
  }

  if (canDriverReuploadReceipt(requisition, user)) {
    return 'You can re-upload the receipt image and edit invoice details.';
  }

  if (canSPMSVoidRIS(requisition, user)) {
    return 'You can void this RIS if it was issued incorrectly.';
  }

  if (canEMDReturnReceipt(requisition, user)) {
    return 'You can return this receipt to the driver for correction.';
  }

  return null; // No edit permission
}

/**
 * Check if any edit action is available for the user
 */
export function hasAnyEditPermission(
  requisition: FuelRequisition,
  user: User
): boolean {
  return (
    canDriverEditRequest(requisition, user) ||
    canEMDEditValidation(requisition, user) ||
    canDriverReuploadReceipt(requisition, user) ||
    canSPMSVoidRIS(requisition, user) ||
    canEMDReturnReceipt(requisition, user) ||
    isAdmin(user)
  );
}
