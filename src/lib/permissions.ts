import type { UserRole, TripTicketStatus, User, TripTicket } from '@/types';

/**
 * Permission actions for trip tickets
 */
export type TripTicketAction =
  | 'create'
  | 'view_own'
  | 'view_all'
  | 'edit_pending'
  | 'submit'
  | 'start_trip'
  | 'approve'
  | 'reject'
  | 'request_cancel'
  | 'request_edit'
  | 'approve_cancel_request'
  | 'approve_edit_request'
  | 'complete_trip'
  | 'generate_pdf'
  | 'attest_signatures'
  | 'print_pdf';

/**
 * RBAC Permission Matrix for Trip Tickets (Module 1)
 */
const TRIP_TICKET_PERMISSIONS: Record<UserRole, TripTicketAction[]> = {
  driver: [
    'create',
    'view_own',
    'edit_pending',
    'submit',
    'start_trip',
    'request_cancel',
    'request_edit',
    'complete_trip',
  ],
  spms: [
    'view_all',
    'approve',
    'reject',
    'approve_cancel_request',
    'approve_edit_request',
    'generate_pdf',
    'attest_signatures',
    'print_pdf',
  ],
  admin: [
    'create',
    'view_own',
    'view_all',
    'edit_pending',
    'submit',
    'start_trip',
    'approve',
    'reject',
    'approve_cancel_request',
    'approve_edit_request',
    'complete_trip',
    'generate_pdf',
    'attest_signatures',
    'print_pdf',
  ],
  emd: [], // EMD is for Module 2 (Fuel Requisition) - no permissions in Module 1
};

/**
 * Check if user has permission for a specific action
 */
export function canPerformAction(
  user: User | null,
  action: TripTicketAction
): boolean {
  if (!user || !user.isActive) return false;
  return TRIP_TICKET_PERMISSIONS[user.role]?.includes(action) ?? false;
}

/**
 * Check if user can view a specific trip ticket
 */
export function canViewTripTicket(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  // Admin and SPMS can view all tickets in their organization
  if (
    (user.role === 'admin' || user.role === 'spms') &&
    user.organizationId === tripTicket.organizationId
  ) {
    return true;
  }

  // Drivers can only view their own tickets
  if (user.role === 'driver' && user.id === tripTicket.driverId) {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a trip ticket
 */
export function canEditTripTicket(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  // Only drivers can edit, and only their own pending tickets
  if (
    user.role === 'driver' &&
    user.id === tripTicket.driverId &&
    tripTicket.status === 'pending_approval'
  ) {
    return true;
  }

  // Admin can edit pending they created
  if (
    user.role === 'admin' &&
    user.id === tripTicket.createdBy &&
    tripTicket.status === 'pending_approval'
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user can submit a trip ticket for approval
 */
export function canSubmitTripTicket(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    (user.role === 'driver' || user.role === 'admin') &&
    user.id === tripTicket.driverId &&
    tripTicket.status === 'pending_approval'
  );
}

export function canStartTrip(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    (user.role === 'driver' || user.role === 'admin') &&
    user.id === tripTicket.driverId &&
    tripTicket.status === 'approved'
  );
}

/**
 * Check if user can approve/reject a trip ticket
 */
export function canReviewTripTicket(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    (user.role === 'spms' || user.role === 'admin') &&
    user.organizationId === tripTicket.organizationId &&
    tripTicket.status === 'pending_approval'
  );
}

/**
 * Check if user can request cancellation
 */
export function canRequestCancellation(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'driver' &&
    user.id === tripTicket.driverId &&
    (tripTicket.status === 'pending_approval' ||
      tripTicket.status === 'approved' ||
      tripTicket.status === 'in_progress')
  );
}

/**
 * Check if user can request edit
 */
export function canRequestEdit(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'driver' &&
    user.id === tripTicket.driverId &&
    tripTicket.status === 'approved'
  );
}

/**
 * Check if user can complete a trip
 */
export function canCompleteTrip(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    user.role === 'driver' &&
    user.id === tripTicket.driverId &&
    tripTicket.status === 'in_progress'
  );
}

/**
 * Check if user can generate/print PDF
 */
export function canGeneratePDF(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    (user.role === 'spms' || user.role === 'admin') &&
    user.organizationId === tripTicket.organizationId &&
    !!tripTicket.serialNumber &&
    (tripTicket.status === 'approved' ||
      tripTicket.status === 'in_progress' ||
      tripTicket.status === 'completed' ||
      (tripTicket.status === 'cancelled' && !!tripTicket.serialNumber))
  );
}

/**
 * Check if user can attest wet signatures
 */
export function canAttestSignatures(
  user: User | null,
  tripTicket: TripTicket
): boolean {
  if (!user || !user.isActive) return false;

  return (
    (user.role === 'spms' || user.role === 'admin') &&
    user.organizationId === tripTicket.organizationId &&
    tripTicket.status === 'approved' &&
    !!tripTicket.pdfUrl &&
    !tripTicket.wetSignaturesCollected
  );
}

/**
 * Get allowed status transitions for a trip ticket
 */
export function getAllowedStatusTransitions(
  currentStatus: TripTicketStatus,
  userRole: UserRole
): TripTicketStatus[] {
  const transitions: Record<TripTicketStatus, Partial<Record<UserRole, TripTicketStatus[]>>> = {
    pending_approval: {
      spms: ['approved', 'rejected'],
      admin: ['approved', 'rejected'],
    },
    approved: {
      driver: ['in_progress', 'completed'],
    },
    in_progress: {
      driver: ['completed'],
    },
    completed: {},
    cancelled: {},
    rejected: {},
  };

  return transitions[currentStatus]?.[userRole] ?? [];
}

/**
 * Check if status transition is allowed
 */
export function canTransitionStatus(
  user: User | null,
  currentStatus: TripTicketStatus,
  newStatus: TripTicketStatus
): boolean {
  if (!user || !user.isActive) return false;

  const allowedTransitions = getAllowedStatusTransitions(currentStatus, user.role);
  return allowedTransitions.includes(newStatus);
}

// ============================================================================
// FUEL REQUISITION MODULE PERMISSIONS
// ============================================================================

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
