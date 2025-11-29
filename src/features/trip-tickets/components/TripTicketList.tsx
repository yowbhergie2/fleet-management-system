import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where, doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Clock3, FileText, MapPin, User, Car, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Modal, Button, Input } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { TripTicket, TripTicketFormData } from '@/types';
import { collection as fbCollection } from 'firebase/firestore';
import { TripTicketForm } from '@/features/trip-tickets/components/TripTicketForm';
import { previewTripTicketPDF } from '@/lib/pdf-generator';

type TripTicketWithId = TripTicket & { id: string };

const statusConfig: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'error' | 'default' }> = {
  pending_approval: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  cancelled: { label: 'Cancelled', variant: 'warning' },
};

export function TripTicketList() {
  const user = useUser();
  const [tickets, setTickets] = useState<TripTicketWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<TripTicketWithId | null>(null);
  const [editingTicket, setEditingTicket] = useState<TripTicketWithId | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});
  const [vehicleMap, setVehicleMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [controlMode, setControlMode] = useState<'auto' | 'manual'>('auto');
  const [controlInput, setControlInput] = useState('');
  const [counterHint, setCounterHint] = useState<number | null>(null);

  const formatDate = (value?: string | Date) => (value ? new Date(value as any).toLocaleDateString() : '-');
  const formatRange = (from?: string | Date, to?: string | Date) => `${formatDate(from)} - ${formatDate(to)}`;

  const loadTickets = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'trip_tickets'),
        where('organizationId', '==', user.organizationId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TripTicket) }));
      setTickets(rows);

      const officeSnap = await getDocs(
        query(fbCollection(db, 'offices'), where('organizationId', '==', user.organizationId))
      );
      const map: Record<string, string> = {};
      officeSnap.docs.forEach((d) => {
        const data = d.data() as any;
        map[d.id] = data.code || data.name || d.id;
      });
      setOfficeMap(map);

      const vehicleSnap = await getDocs(
        query(fbCollection(db, 'vehicles'), where('organizationId', '==', user.organizationId))
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

  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const q = searchTerm.toLowerCase();
    return tickets.filter((t) => {
      const ref = (t.referenceId || t.serialNumber || t.id || '').toLowerCase();
      const dest = (t.destination || '').toLowerCase();
      const drv = (t.driverName || '').toLowerCase();
      const off = (officeMap[t.divisionOffice] || t.divisionOffice || '').toLowerCase();
      const veh = (vehicleMap[t.vehicleId] || t.vehicleId || '').toLowerCase();
      return ref.includes(q) || dest.includes(q) || drv.includes(q) || off.includes(q) || veh.includes(q);
    });
  }, [tickets, searchTerm, officeMap, vehicleMap]);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  useEffect(() => {
    const loadCounter = async () => {
      if (!selected || selected.status !== 'pending_approval') {
        setCounterHint(null);
        return;
      }
      try {
        const year = new Date().getFullYear();
        const snap = await getDocs(query(collection(db, 'serial_numbers'), where('__name__', '==', `dtt-${year}`)));
        const docSnap = snap.docs.find((d) => d.id === `dtt-${year}`);
        if (docSnap) {
          const data = docSnap.data() as any;
          setCounterHint(data.counter || 0);
        } else {
          setCounterHint(0);
        }
      } catch {
        setCounterHint(null);
      }
    };
    loadCounter();
  }, [selected]);

  const parseControl = (value: string) => {
    const match = /^DTT-(\d{4})-(\d{4})$/.exec(value.trim().toUpperCase());
    if (!match) return null;
    return { year: Number(match[1]), num: Number(match[2]), formatted: `DTT-${match[1]}-${match[2]}` };
  };

  const checkControlAvailable = async (control: string, currentId?: string) => {
    const formatted = control.toUpperCase();
    const dupSerial = await getDocs(query(collection(db, 'trip_tickets'), where('serialNumber', '==', formatted)));
    const dupReserved = await getDocs(query(collection(db, 'trip_tickets'), where('serialNumberReserved', '==', formatted)));
    const dupStandalone = await getDocs(
      query(collection(db, 'serial_reservations'), where('controlNumber', '==', formatted), where('status', '==', 'reserved'))
    );
    const conflictSerial = dupSerial.docs.find((d) => d.id !== currentId);
    const conflictReserved = dupReserved.docs.find((d) => d.id !== currentId);
    const conflictStandalone = dupStandalone.docs.find((d) => d.id !== currentId);
    return !(conflictSerial || conflictReserved || conflictStandalone);
  };

  const bumpCounterIfNeeded = async (year: number, num: number) => {
    const counterRef = doc(db, 'serial_numbers', `dtt-${year}`);
    await runTransaction(db, async (trx) => {
      const snap = await trx.get(counterRef);
      const current = snap.exists() ? snap.data().counter || 0 : 0;
      const next = Math.max(current, num);
      trx.set(counterRef, { counter: next, year }, { merge: true });
    });
  };

  const handleStatusUpdate = async (ticket: TripTicketWithId, newStatus: TripTicket['status']) => {
    setActionLoadingId(ticket.id);
    try {
      const docRef = doc(db, 'trip_tickets', ticket.id);

      if (newStatus === 'approved') {
        let serialNumber = ticket.serialNumberReserved || ticket.serialNumber;

        if (controlMode === 'manual' && controlInput.trim()) {
          const parsed = parseControl(controlInput);
          if (!parsed) throw new Error('Invalid control number format. Use DTT-YYYY-NNNN');
          const formatted = parsed.formatted;
          const available = await checkControlAvailable(formatted, ticket.id);
          if (!available) throw new Error('Control number already in use or reserved.');
          await bumpCounterIfNeeded(parsed.year, parsed.num);
          serialNumber = formatted;
        }

        if (!serialNumber) {
          const now = new Date();
          const year = now.getFullYear();
          serialNumber = await runTransaction(db, async (trx) => {
            const counterRef = doc(db, 'serial_numbers', `dtt-${year}`);
            const snap = await trx.get(counterRef);
            const current = snap.exists() ? (snap.data().counter || 0) : 0;
            const next = current + 1;
            trx.set(counterRef, { counter: next, year }, { merge: true });
            return `DTT-${year}-${String(next).padStart(4, '0')}`;
          });
        }

        await updateDoc(docRef, {
          status: 'approved',
          serialNumber,
          serialNumberReserved: null,
          pdfAvailable: true,
          approvedBy: user?.id || null,
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // mark standalone reservation as used if exists
        const reservationSnap = await getDocs(
          query(
            collection(db, 'serial_reservations'),
            where('controlNumber', '==', serialNumber),
            where('status', '==', 'reserved'),
            where('organizationId', '==', user?.organizationId || '')
          )
        );
        const reservationDoc = reservationSnap.docs[0];
        if (reservationDoc) {
          await updateDoc(reservationDoc.ref, {
            status: 'used',
            usedAt: serverTimestamp(),
            ticketId: ticket.id,
          });
        }

        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id ? { ...t, status: 'approved', serialNumber, pdfAvailable: true, serialNumberReserved: null } : t
          )
        );
        setSelected((prev) =>
          prev?.id === ticket.id ? { ...prev, status: 'approved', serialNumber, pdfAvailable: true, serialNumberReserved: null } : prev
        );
        setToast({ type: 'success', text: `Trip ticket approved. Control No: ${serialNumber}` });
      } else if (newStatus === 'rejected') {
        await updateDoc(docRef, {
          status: 'rejected',
          pdfAvailable: false,
          updatedAt: serverTimestamp(),
        });
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'rejected', pdfAvailable: false } : t)));
        setSelected((prev) => (prev?.id === ticket.id ? { ...prev, status: 'rejected', pdfAvailable: false } : prev));
        setToast({ type: 'success', text: 'Trip ticket rejected.' });
      } else {
        await updateDoc(docRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() as any } : t))
        );
        setSelected((prev) => (prev?.id === ticket.id ? { ...prev, status: newStatus } : prev));
        setToast({ type: 'success', text: `Trip ticket ${newStatus.replace('_', ' ')}.` });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: 'Failed to update trip ticket.' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(null), 2500);
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
      setToast({ type: 'success', text: 'Trip ticket updated successfully.' });
      setEditingTicket(null);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: 'Failed to update trip ticket.' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleReserve = async () => {
    if (!selected) return;
    const parsed = parseControl(controlInput);
    if (!parsed) {
      setToast({ type: 'error', text: 'Invalid control number. Use DTT-YYYY-NNNN format.' });
      return;
    }
    const formatted = parsed.formatted;
    setActionLoadingId(selected.id);
    try {
      const available = await checkControlAvailable(formatted, selected.id);
      if (!available) throw new Error('Control number already in use or reserved.');
      await bumpCounterIfNeeded(parsed.year, parsed.num);
      await updateDoc(doc(db, 'trip_tickets', selected.id), {
        serialNumberReserved: formatted,
        reservedBy: user?.id || null,
        reservedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, serialNumberReserved: formatted } : t))
      );
      setSelected((prev) => (prev?.id === selected.id ? { ...prev, serialNumberReserved: formatted } : prev));
      setToast({ type: 'success', text: `Reserved Control No: ${formatted}` });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reserve control number.' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const isPdfAvailable = (t: TripTicketWithId) => !!t.pdfAvailable && !!t.serialNumber;

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

  const renderRefId = (value: string) => (
    <span className="text-base font-bold text-indigo-600 uppercase tracking-wide">
      {value}
    </span>
  );

  const refValue = (ticket: TripTicketWithId) => ticket.referenceId || ticket.serialNumber || ticket.id;

  const renderBadge = (value: string) => (
    <Badge variant="outline" className="text-xs font-semibold">
      REF: {value}
    </Badge>
  );

  return (
    <>
      <Card className="shadow-lg border-0">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Trip Tickets</CardTitle>
              <p className="text-sm text-gray-600">List of trip tickets</p>
            </div>
            <button
              onClick={loadTickets}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <Input
            placeholder="Search ref, destination, driver, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-gray-500">Loading trip tickets...</p>}
          {!isLoading && tickets.length === 0 && (
            <p className="text-sm text-gray-500">No trip tickets yet.</p>
          )}
          {!isLoading &&
            filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.default;
              const actions = spmsActions(ticket);
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
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{ticket.driverName || 'Driver'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{vehicleMap[ticket.vehicleId] || ticket.vehicleId || 'Vehicle'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{formatRange(ticket.periodCoveredFrom, ticket.periodCoveredTo)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                    {actions.pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
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
                        View PDF
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-lg shadow-lg px-4 py-3 text-sm text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.text}
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

            {selected.status === 'pending_approval' && (
              <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-indigo-900">Control Number</p>
                  {selected.serialNumberReserved && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                      Reserved: {selected.serialNumberReserved}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Choose how to assign the official DTT control number for this ticket.
                </p>
                {counterHint !== null && (
                  <p className="text-xs text-gray-500">
                    Next available: DTT-{new Date().getFullYear()}-{String(counterHint + 1).padStart(4, '0')}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      className="h-4 w-4"
                      checked={controlMode === 'auto'}
                      onChange={() => setControlMode('auto')}
                    />
                    Auto-generate next
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      className="h-4 w-4"
                      checked={controlMode === 'manual'}
                      onChange={() => setControlMode('manual')}
                    />
                    Enter manually / Reserve
                  </label>
                </div>
                {controlMode === 'manual' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="DTT-YYYY-NNNN"
                      value={controlInput}
                      onChange={(e) => setControlInput(e.target.value.toUpperCase())}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReserve}
                      disabled={!controlInput.trim() || actionLoadingId === selected.id}
                      isLoading={actionLoadingId === selected.id && !selected.serialNumber}
                    >
                      Reserve
                    </Button>
                  </div>
                )}
                {controlMode === 'manual' && counterHint !== null && (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const year = new Date().getFullYear();
                      const suggestion = `DTT-${year}-${String((counterHint || 0) + idx + 1).padStart(4, '0')}`;
                      return (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={() => setControlInput(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
          onClose={() => {
            setSelected(null);
            setControlMode('auto');
            setControlInput('');
          }}
          actions={[
            {
              label: 'Close',
              variant: 'outline',
              onClick: () => {
                setSelected(null);
                setControlMode('auto');
                setControlInput('');
              },
            },
          ]}
        />
      )}

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
    </>
  );
}
