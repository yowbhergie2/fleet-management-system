/**
 * User roles in the system
 * Note: Approvers are NOT in the system - they sign physical documents
 */
export type UserRole = 'driver' | 'emd' | 'spms' | 'admin';

/**
 * Trip ticket status
 */
export type TripTicketStatus =
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

/**
 * Trip ticket action request types
 */
export type TripTicketActionType = 'cancel' | 'edit';

export type ActionRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Fuel request status
 */
export type FuelRequestStatus =
  | 'pending_emd'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'cancelled';

/**
 * Vehicle types
 */
export type VehicleType = 'sedan' | 'suv' | 'van' | 'truck' | 'motorcycle';

/**
 * Fuel types
 */
export type FuelType = 'gasoline' | 'diesel';

/**
 * Vehicle status
 */
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'decommissioned';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  divisionOffice?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  position?: string;
  phoneNumber?: string;
}

/**
 * Vehicle interface
 */
export interface Vehicle {
  id: string;
  plateNumber: string;
  organizationId: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  assignedDriver?: string;
  assignedDivision?: string;
  status: VehicleStatus;
  fuelType: FuelType;
  fuelEconomyKmPerLiter: number;
  tankCapacityLiters: number;
  currentOdometer: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Passenger in trip ticket
 */
export interface Passenger {
  name: string;
  position?: string;
}

/**
 * Trip ticket interface
 */
export interface TripTicket {
  id: string;
  serialNumber?: string; // Generated only when approved
  organizationId: string;

  // Driver & Vehicle
  driverId: string;
  driverName: string;
  vehicleId: string;
  plateNumber: string;
  divisionOffice: string;

  // Trip Details
  authorizedPassengers: Passenger[];
  destination: string;
  purposes: string[];

  // Period Covered
  periodCoveredFrom: Date;
  periodCoveredTo: Date;

  // Approval
 approvingAuthorityId?: string;
  approvingAuthorityName?: string;
  authorityPrefix?: string;
  approvingAuthorityPosition?: string;
  approvingAuthorityId?: string;
  recommendingOfficerId?: string;
  recommendingOfficerId?: string;
  recommendingOfficerName?: string;
  recommendingOfficerPosition?: string;

  // Status
  status: TripTicketStatus;

  // Approval/Rejection metadata
  approvedBy?: string; // SPMS/Admin user ID
  approvedByName?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  referenceId?: string;
  pdfAvailable?: boolean;
  risId?: string;
  risNumber?: string;

  // PDF & Wet Signatures
  pdfUrl?: string; // Generated PDF URL
  wetSignaturesCollected?: boolean;
  wetSignaturesAttestedBy?: string;
  wetSignaturesAttestedAt?: Date;

  // Trip Execution (filled during/after trip)
  actualDepartureTime?: Date;
  actualArrivalTime?: Date;
  odometerStart?: number;
  odometerEnd?: number;
  distanceTraveled?: number;
  placesVisited?: string[];

  // Fuel Consumption
  fuelIssuedLiters?: number;
  fuelPurchasedLiters?: number;
  totalFuelConsumed?: number;
  fuelGaugeStart?: string;
  fuelGaugeEnd?: string;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Trip ticket action request (for cancellation or edit requests)
 */
export interface TripTicketActionRequest {
  id: string;
  tripTicketId: string;
  organizationId: string;
  actionType: TripTicketActionType;
  requestedBy: string;
  requestedByName: string;
  requestedAt: Date;
  reason: string;
  status: ActionRequestStatus;

  // Fields to edit (for edit requests)
  fieldsToEdit?: {
    destination?: string;
    purposes?: string[];
    periodCoveredFrom?: Date;
    periodCoveredTo?: Date;
  };

  // Review
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

/**
 * Form data for creating trip ticket
 */
export interface TripTicketFormData {
  vehicleId: string;
  approvingAuthorityId?: string;
  recommendingOfficerId?: string;
  divisionOffice: string;
  authorizedPassengers: Passenger[];
  destination: string;
  purposes: string[];
  periodCoveredFrom: string;
  periodCoveredTo: string;
  approvingAuthorityName: string;
  authorityPrefix?: string;
  recommendingOfficerName: string;
  approvingAuthorityPosition?: string;
  recommendingOfficerPosition?: string;
}

// ============================================================================
// FUEL REQUISITION MODULE TYPES
// ============================================================================

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
 * Office interface (for organizational structure)
 */
export interface Office {
  id: string;
  code: string;
  name: string;
  signatoryId: string | null;
  signatoryName?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Approving Authority interface (for fuel requisition approvals)
 */
export interface ApprovingAuthority {
  id: string;
  officerId: string;
  name: string;
  position: string;
  prefix: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  fuelType: 'DIESEL'; // Only DIESEL is supported
  supplierId?: string;
  supplierName?: string;
  pricePerLiter: number;
  effectiveDate: Date;
  isCurrent: boolean;
  updatedBy: string;
  updatedByName: string;
  organizationId: string;
  createdAt: Date;
  updatedAt?: Date;
  isVoided?: boolean;
  voidReason?: string | null;
  voidedAt?: Date | null;
  voidedBy?: string | null;
  voidedByName?: string | null;
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
  fuelType: 'DIESEL'; // Only DIESEL is supported
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
  receiptImageBase64: string | null; // Base64 encoded image (stored temporarily)
  imageArchivedAt: Date | null; // When image was moved to receipt_archives
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
 * Receipt archive interface (for storing archived receipt images)
 */
export interface ReceiptArchive {
  id: string;
  requisitionId: string;
  risNumber: string;
  receiptImageBase64: string;
  archivedAt: Date;
  archivedBy: string;
  archivedByName: string;
  organizationId: string;
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
