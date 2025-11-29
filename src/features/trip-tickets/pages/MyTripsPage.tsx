import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, orderBy, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Modal, Input } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { TripTicket, TripTicketFormData } from '@/types';
import { Clock3, FileText, User, Car } from 'lucide-react';
import { previewTripTicketPDF } from '@/lib/pdf-generator';
import { TripTicketForm } from '@/features/trip-tickets/components/TripTicketForm';

type TripTicketWithId = TripTicket & { id: string };

const tabs = [
  { key: 'pending', label: 'Pending', statuses: ['pending_approval'] },
  { key: 'approved', label: 'Approved', statuses: ['approved'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
] as const;

const statusConfig: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'error' | 'default' }> = {
  pending_approval: { label: 'Pending Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  cancelled: { label: 'Cancelled', variant: 'warning' },
  default: { label: 'Unknown', variant: 'default' },
};

export function MyTripsPage() {
  const user = useUser();
  const [tickets, setTickets] = useState<TripTicketWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('pending');
  const [selected, setSelected] = useState<TripTicketWithId | null>(null);
  const [editingTicket, setEditingTicket] = useState<TripTicketWithId | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});
  const [vehicleMap, setVehicleMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const isDriver = user?.role === 'driver';
  const formatDate = (value?: string | Date) => (value ? new Date(value as any).toLocaleDateString() : '-');
  const formatRange = (from?: string | Date, to?: string | Date) => `${formatDate(from)} - ${formatDate(to)}`;

  const loadTickets = async () => {
    if (!user?.organizationId || !user?.id) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'trip_tickets'),
        where('organizationId', '==', user.organizationId),
        where('driverId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TripTicket) }));
      setTickets(rows);

      const officeSnap = await getDocs(
        query(collection(db, 'offices'), where('organizationId', '==', user.organizationId))
      );
      const map: Record<string, string> = {};
      officeSnap.docs.forEach((d) => {
        const data = d.data() as any;
        map[d.id] = data.code || data.name || d.id;
      });
      setOfficeMap(map);

      const vehicleSnap = await getDocs(
        query(collection(db, 'vehicles'), where('organizationId', '==', user.organizationId))
      );
      const vmap: Record<string, string> = {};
      vehicleSnap.docs.forEach((d) => {
        const data = d.data() as any;
        vmap[d.id] = data.dpwhNumber || data.plateNumber || d.id;
      });
      setVehicleMap(vmap);
    } catch (err) {
      console.error('Failed to load trip tickets', err);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, user?.id]);

  const filteredTickets = useMemo(() => {
    const tab = tabs.find((t) => t.key === activeTab);
    const byStatus = !tab ? tickets : tickets.filter((ticket) => tab.statuses.includes(ticket.status));
    if (!searchTerm.trim()) return byStatus;
    const q = searchTerm.toLowerCase();
    return byStatus.filter((t) => {
      const ref = (t.referenceId || t.serialNumber || t.id || '').toLowerCase();
      const dest = (t.destination || '').toLowerCase();
      const drv = (t.driverName || '').toLowerCase();
      const off = (officeMap[t.divisionOffice] || t.divisionOffice || '').toLowerCase();
      const veh = (vehicleMap[t.vehicleId] || t.vehicleId || '').toLowerCase();
      return ref.includes(q) || dest.includes(q) || drv.includes(q) || off.includes(q) || veh.includes(q);
    });
  }, [activeTab, tickets, searchTerm, officeMap, vehicleMap]);

  const handleStatusUpdate = async (ticket: TripTicketWithId, newStatus: TripTicket['status']) => {
    setActionMessage(null);
    setActionLoadingId(ticket.id);
    try {
      await updateDoc(doc(db, 'trip_tickets', ticket.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      await loadTickets();
      setActionMessage({ type: 'success', text: `Trip ticket ${newStatus.replace('_', ' ')}.` });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Failed to update trip ticket.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEditSubmit = async (data: TripTicketFormData) => {
    if (!editingTicket) return;
    setActionLoadingId(editingTicket.id);
    try {
      await updateDoc(doc(db, 'trip_tickets', editingTicket.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      await loadTickets();
      setActionMessage({ type: 'success', text: 'Trip ticket updated successfully.' });
      setEditingTicket(null);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Failed to update trip ticket.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const isPdfAvailable = (t: TripTicketWithId) => !!t.pdfAvailable && !!t.serialNumber;

  const driverActions = (t: TripTicketWithId) => {
    switch (t.status) {
      case 'pending_approval':
        return { view: true, edit: true, start: false, cancel: true, complete: false, requestFuel: false, pdf: false, approve: false, reject: false };
      case 'approved':
        return { view: true, edit: false, start: true, cancel: true, complete: false, requestFuel: false, pdf: isPdfAvailable(t), approve: false, reject: false };
      case 'in_progress':
        return { view: true, edit: false, start: false, cancel: false, complete: true, requestFuel: false, pdf: isPdfAvailable(t), approve: false, reject: false };
      case 'completed':
        return { view: true, edit: false, start: false, cancel: false, complete: false, requestFuel: true, pdf: isPdfAvailable(t), approve: false, reject: false };
      case 'rejected':
      case 'cancelled':
      default:
        return { view: true, edit: false, start: false, cancel: false, complete: false, requestFuel: false, pdf: isPdfAvailable(t), approve: false, reject: false };
    }
  };

  const spmsActions = (t: TripTicketWithId) => {
    const wasApproved = t.status === 'approved' || t.status === 'in_progress' || t.status === 'completed';

    switch (t.status) {
      case 'pending_approval':
        return { view: true, edit: true, approve: true, reject: true, cancel: true, pdf: false };
      case 'approved':
        return { view: true, edit: true, approve: false, reject: false, cancel: true, pdf: isPdfAvailable(t) };
      case 'in_progress':
        return { view: true, edit: false, approve: false, reject: false, cancel: false, pdf: isPdfAvailable(t) };
      case 'completed':
        return { view: true, edit: true, approve: false, reject: false, cancel: false, pdf: isPdfAvailable(t) };
      case 'rejected':
        return { view: true, edit: false, approve: false, reject: false, cancel: false, pdf: false };
      case 'cancelled':
        return { view: true, edit: false, approve: false, reject: false, cancel: false, pdf: wasApproved ? isPdfAvailable(t) : false };
      default:
        return { view: true, edit: false, approve: false, reject: false, cancel: false, pdf: false };
    }
  };

  const getActions = (t: TripTicketWithId) => {
    if (user?.role === 'spms') return spmsActions(t);
    return driverActions(t);
  };

  const renderRefId = (value: string) => (
    <span className="text-base font-bold text-indigo-600 uppercase tracking-wide">
      {value}
    </span>
  );

  const refValue = (ticket: TripTicketWithId) => ticket.referenceId || ticket.serialNumber || ticket.id;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-2xl">My Trip Tickets</CardTitle>
            <p className="text-sm text-gray-600">
              {isDriver ? 'Only your submissions are shown.' : 'Driver-specific view. Showing trips assigned to you.'}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Search ref, destination, driver, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {actionMessage.text}
            </div>
          )}
          {isLoading && <p className="text-sm text-gray-500">Loading your trip tickets...</p>}
          {!isLoading && filteredTickets.length === 0 && (
            <p className="text-sm text-gray-500">No trip tickets found in this tab.</p>
          )}
          {!isLoading &&
            filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.default;
              return (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderRefId(refValue(ticket))}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 break-words">
                          {ticket.destination || 'No destination'}
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant={status.variant} className="whitespace-nowrap">
                        {status.label}
                      </Badge>
                      {ticket.serialNumber && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          Control No: {ticket.serialNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                    {(user?.role === 'spms' || user?.role === 'admin') && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{ticket.driverName || 'Driver'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{vehicleMap[ticket.vehicleId] || ticket.vehicleId || 'Vehicle'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{formatRange(ticket.periodCoveredFrom, ticket.periodCoveredTo)}</span>
                    </div>
                  </div>
                  {(() => {
                    const actions = getActions(ticket);
                    return (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actions.view && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => setSelected(ticket)}
                          >
                            View Details
                          </Button>
                        )}
                        {actions.approve && (
                          <Button
                            variant="success"
                            size="sm"
                            className="rounded-full shadow-sm shadow-emerald-100"
                            onClick={() => handleStatusUpdate(ticket, 'approved')}
                            isLoading={actionLoadingId === ticket.id}
                          >
                            Approve
                          </Button>
                        )}
                        {actions.reject && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full shadow-sm shadow-red-100"
                            onClick={() => handleStatusUpdate(ticket, 'rejected')}
                            isLoading={actionLoadingId === ticket.id}
                          >
                            Reject
                          </Button>
                        )}
                        {actions.edit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-gray-200 text-gray-800 hover:bg-gray-50"
                            onClick={() => setEditingTicket(ticket)}
                          >
                            Edit
                          </Button>
                        )}
                        {actions.start && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => handleStatusUpdate(ticket, 'in_progress')}
                            isLoading={actionLoadingId === ticket.id}
                          >
                            Start Trip
                          </Button>
                        )}
                        {actions.cancel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleStatusUpdate(ticket, 'cancelled')}
                            isLoading={actionLoadingId === ticket.id}
                          >
                            Cancel
                          </Button>
                        )}
                        {actions.complete && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-full gap-2"
                            onClick={() => handleStatusUpdate(ticket, 'completed')}
                            isLoading={actionLoadingId === ticket.id}
                          >
                            Mark Complete
                          </Button>
                        )}
                        {actions.requestFuel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-2"
                            onClick={() => alert('Request Fuel flow goes here.')}
                          >
                            Request Fuel
                          </Button>
                        )}
                        {actions.pdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              previewTripTicketPDF(
                                {
                                  divisionOffice: ticket.divisionOffice,
                                  destination: ticket.destination,
                                  purposes: ticket.purposes || [],
                                  periodCoveredFrom: ticket.periodCoveredFrom as any,
                                  periodCoveredTo: ticket.periodCoveredTo as any,
                                  approvingAuthorityName: ticket.approvingAuthorityName || '',
                                  authorityPrefix: ticket.authorityPrefix || '',
                                  recommendingOfficerName: ticket.recommendingOfficerName || '',
                                  vehicleId: ticket.vehicleId,
                                  authorizedPassengers: ticket.authorizedPassengers || [],
                                },
                                ticket.serialNumber || 'DTT',
                                ticket.driverName || 'Driver'
                              )
                            }
                          >
                            PDF
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {editingTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen px-2 sm:px-4 py-4 sm:py-8 flex items-start justify-center">
            <div className="w-full max-w-6xl rounded-xl bg-white shadow-2xl border border-gray-200 max-h-[95vh] flex flex-col my-4">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Trip Ticket</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Update trip ticket details</p>
                </div>
                <button
                  onClick={() => setEditingTicket(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4 text-2xl leading-none"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
              <div className="px-4 sm:px-5 py-4 overflow-y-auto flex-1">
                <TripTicketForm
                  onSubmit={handleEditSubmit}
                  initialData={editingTicket}
                  isEditMode={true}
                  isLoading={actionLoadingId === editingTicket.id}
                  onCancel={() => setEditingTicket(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <Modal
          open={true}
          title=""
          size="lg"
          description={
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 -mx-5 -mt-4 px-5 py-5 border-b border-indigo-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-bold text-indigo-600 uppercase tracking-wide">
                        {refValue(selected)}
                      </span>
                      {selected.serialNumber && (
                        <Badge variant="outline" className="text-xs font-semibold bg-white">
                          DTT: {selected.serialNumber}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 break-words leading-tight">
                      {selected.destination || 'Trip Ticket'}
                    </h2>
                  </div>
                  <Badge variant={statusConfig[selected.status]?.variant || 'default'} className="flex-shrink-0 whitespace-nowrap">
                    {statusConfig[selected.status]?.label || selected.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock3 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{formatRange(selected.periodCoveredFrom, selected.periodCoveredTo)}</span>
                </div>
              </div>

              {/* Trip Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Trip Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">Driver</p>
                    <p className="font-semibold text-gray-900">{selected.driverName || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">Division/Office</p>
                    <p className="font-semibold text-gray-900">{officeMap[selected.divisionOffice] || selected.divisionOffice || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">Vehicle</p>
                    <p className="font-semibold text-gray-900">{vehicleMap[selected.vehicleId] || selected.vehicleId || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">Destination</p>
                    <p className="font-semibold text-gray-900 break-words">{selected.destination || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Purpose & Passengers */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Details</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <p className="text-xs uppercase text-amber-700 font-bold mb-2 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Purpose(s)
                    </p>
                    <div className="space-y-1.5 text-sm text-gray-700">
                      {selected.purposes && selected.purposes.length > 0 ? (
                        selected.purposes.map((p, idx) => (
                          <p key={`${selected.id}-purpose-${idx}`} className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>{p}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No purposes listed</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-xs uppercase text-blue-700 font-bold mb-2 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Passengers
                    </p>
                    <div className="space-y-1.5 text-sm text-gray-700">
                      {selected.authorizedPassengers && selected.authorizedPassengers.length > 0 ? (
                        selected.authorizedPassengers.map((p, idx) => (
                          <p key={`${selected.id}-passenger-${idx}`} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{p.name}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No passengers listed</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Approvals */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Approvals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <p className="text-xs uppercase text-emerald-700 font-bold mb-1">Approving Authority</p>
                    <p className="font-bold text-gray-900">{selected.approvingAuthorityName || '-'}</p>
                    {selected.authorityPrefix && (
                      <p className="text-xs text-gray-600 mt-1">{selected.authorityPrefix}</p>
                    )}
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <p className="text-xs uppercase text-emerald-700 font-bold mb-1">Recommending Officer</p>
                    <p className="font-bold text-gray-900">{selected.recommendingOfficerName || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          }
          onClose={() => setSelected(null)}
          actions={[
            { label: 'Close', variant: 'outline', onClick: () => setSelected(null) },
          ]}
        />
      )}
    </div>
  );
}
