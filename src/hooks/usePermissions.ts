import { useMemo } from 'react';
import { useUser } from '@/stores/authStore';
import type { TripTicket } from '@/types';
import {
  canPerformAction,
  canViewTripTicket,
  canEditTripTicket,
  canSubmitTripTicket,
  canReviewTripTicket,
  canRequestCancellation,
  canRequestEdit,
  canCompleteTrip,
  canGeneratePDF,
  canAttestSignatures,
  type TripTicketAction,
} from '@/lib/permissions';

/**
 * Hook to check trip ticket permissions
 */
export function useTripTicketPermissions(tripTicket?: TripTicket) {
  const user = useUser();

  return useMemo(() => {
    if (!tripTicket) {
      return {
        canView: false,
        canEdit: false,
        canSubmit: false,
        canReview: false,
        canRequestCancel: false,
        canRequestEdit: false,
        canComplete: false,
        canGeneratePDF: false,
        canAttestSignatures: false,
      };
    }

    return {
      canView: canViewTripTicket(user, tripTicket),
      canEdit: canEditTripTicket(user, tripTicket),
      canSubmit: canSubmitTripTicket(user, tripTicket),
      canReview: canReviewTripTicket(user, tripTicket),
      canRequestCancel: canRequestCancellation(user, tripTicket),
      canRequestEdit: canRequestEdit(user, tripTicket),
      canComplete: canCompleteTrip(user, tripTicket),
      canGeneratePDF: canGeneratePDF(user, tripTicket),
      canAttestSignatures: canAttestSignatures(user, tripTicket),
    };
  }, [user, tripTicket]);
}

/**
 * Hook to check if user can perform a specific action
 */
export function useCanPerform(action: TripTicketAction): boolean {
  const user = useUser();

  return useMemo(() => {
    return canPerformAction(user, action);
  }, [user, action]);
}

/**
 * Hook to get user role-based features
 */
export function useRoleFeatures() {
  const user = useUser();

  return useMemo(() => {
    if (!user) {
      return {
        canCreateTripTickets: false,
        canViewAllTickets: false,
        canApproveTickets: false,
        canManageUsers: false,
        canManageVehicles: false,
        canViewReports: false,
        canAccessAuditLogs: false,
      };
    }

    const role = user.role;

    return {
      canCreateTripTickets: role === 'driver' || role === 'admin',
      canViewAllTickets: role === 'spms' || role === 'admin',
      canApproveTickets: role === 'spms' || role === 'admin',
      canManageUsers: role === 'admin',
      canManageVehicles: role === 'admin',
      canViewReports: role === 'admin',
      canAccessAuditLogs: role === 'admin',
    };
  }, [user]);
}
