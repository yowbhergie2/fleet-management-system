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
  recommendingOfficerId?: string;
  recommendingOfficerName?: string;

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
  divisionOffice: string;
  authorizedPassengers: Passenger[];
  destination: string;
  purposes: string[];
  periodCoveredFrom: string;
  periodCoveredTo: string;
  approvingAuthorityName: string;
  authorityPrefix?: string;
  recommendingOfficerName: string;
}
