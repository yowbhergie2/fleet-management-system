import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Modal, Textarea } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { TripTicket } from '@/types';
import { Clock3, FileText, MapPin, User } from 'lucide-react';
import { previewTripTicketPDF } from '@/lib/pdf-generator';

type TripTicketWithId = TripTicket & { id: string };

const statusConfig: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'destructive' | 'default' }> = {
  pending_approval: { label: 'Pending Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  default: { label: 'Unknown', variant: 'default' },
};

export function TripTicketApprovals() {
  const user = useUser();
  const [tickets, setTickets] = useState<TripTicketWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<TripTicketWithId | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [controlMode, setControlMode] = useState<'auto' | 'manual'>('auto');
  const [controlInput, setControlInput] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActing, setIsActing] = useState(false);

  const loadTickets = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'trip_tickets'),
        where('organizationId', '==', user.organizationId),
        where('status', '==', 'pending_approval'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TripTicket) }));
      setTickets(rows);
    } catch (err) {
      console.error('Failed to load pending trip tickets', err);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

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

  const handleDecision = async () => {
    if (!selected || !decision) return;
    setIsActing(true);
    setActionMessage(null);
    try {
      const docRef = doc(db, 'trip_tickets', selected.id);
      if (decision === 'approve') {
        let serialNumber = selected.serialNumberReserved || selected.serialNumber;

        if (controlMode === 'manual' && controlInput.trim()) {
          const parsed = parseControl(controlInput);
          if (!parsed) throw new Error('Invalid control number format. Use DTT-YYYY-NNNN');
          const formatted = parsed.formatted;
          const available = await checkControlAvailable(formatted, selected.id);
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
          reviewerComments: comments || null,
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
            ticketId: selected.id,
          });
        }
        setActionMessage({ type: 'success', text: `Trip ticket approved. Control No: ${serialNumber}` });
      } else {
        await updateDoc(docRef, {
          status: 'rejected',
          rejectionReason: comments || 'No reason provided',
          reviewedBy: user?.id || null,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActionMessage({ type: 'success', text: 'Trip ticket rejected.' });
      }
      setSelected(null);
      setDecision(null);
      setComments('');
      setControlMode('auto');
      setControlInput('');
      await loadTickets();
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Failed to update trip ticket.' });
    } finally {
      setIsActing(false);
    }
  };

  const handleReserve = async () => {
    if (!selected) return;
    const parsed = parseControl(controlInput);
    if (!parsed) {
      setActionMessage({ type: 'error', text: 'Invalid control number. Use DTT-YYYY-NNNN format.' });
      return;
    }
    const formatted = parsed.formatted;
    setIsActing(true);
    setActionMessage(null);
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
      setActionMessage({ type: 'success', text: `Reserved Control No: ${formatted}` });
      await loadTickets();
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reserve control number.' });
    } finally {
      setIsActing(false);
    }
  };

  const pdfData = useMemo(() => {
    if (!selected) return null;
    return {
      divisionOffice: selected.divisionOffice,
      destination: selected.destination,
      purposes: selected.purposes || [],
      periodCoveredFrom: selected.periodCoveredFrom as any,
      periodCoveredTo: selected.periodCoveredTo as any,
      approvingAuthorityName: selected.approvingAuthorityName || '',
      authorityPrefix: selected.authorityPrefix || '',
      recommendingOfficerName: selected.recommendingOfficerName || '',
      vehicleId: selected.vehicleId,
      authorizedPassengers: selected.authorizedPassengers || [],
    };
  }, [selected]);

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-0">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Pending Trip Tickets</CardTitle>
            <p className="text-sm text-gray-600">SPMS review queue</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadTickets} isLoading={isLoading}>
            Refresh
          </Button>
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
          {isLoading && <p className="text-sm text-gray-500">Loading pending trip tickets...</p>}
          {!isLoading && tickets.length === 0 && <p className="text-sm text-gray-500">No pending trip tickets.</p>}
          {!isLoading &&
            tickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.default;
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className="w-full text-left rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all p-4 bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{ticket.serialNumber || `Draft ${ticket.id}`}</p>
                        <p className="text-base font-semibold text-gray-900">{ticket.destination || 'No destination'}</p>
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{ticket.driverName || 'Driver'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{ticket.divisionOffice || 'Division'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-gray-400" />
                      <span>
                        {ticket.periodCoveredFrom ? new Date(ticket.periodCoveredFrom as any).toLocaleDateString() : '-'} –{' '}
                        {ticket.periodCoveredTo ? new Date(ticket.periodCoveredTo as any).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
        </CardContent>
      </Card>

      {selected && (
        <Modal
          open={true}
          title={selected.destination || 'Trip Ticket'}
          size="lg"
          description={
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Status</span>
                <Badge variant={statusConfig[selected.status]?.variant || 'default'}>
                  {statusConfig[selected.status]?.label || selected.status}
                </Badge>
              </div>
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
                      disabled={!controlInput.trim() || isActing}
                      isLoading={isActing && !decision}
                    >
                      Reserve
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold">Driver</p>
                  <p>{selected.driverName}</p>
                </div>
                <div>
                  <p className="font-semibold">Division/Office</p>
                  <p>{selected.divisionOffice}</p>
                </div>
                <div>
                  <p className="font-semibold">Vehicle</p>
                  <p>{selected.plateNumber || selected.vehicleId}</p>
                </div>
                <div>
                  <p className="font-semibold">Period Covered</p>
                  <p>
                    {selected.periodCoveredFrom ? new Date(selected.periodCoveredFrom as any).toLocaleDateString() : '-'} –{' '}
                    {selected.periodCoveredTo ? new Date(selected.periodCoveredTo as any).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold">Destination</p>
                <p>{selected.destination}</p>
              </div>
              <div>
                <p className="font-semibold">Purpose(s)</p>
                <ul className="list-disc list-inside space-y-1">
                  {selected.purposes?.map((p, idx) => (
                    <li key={`${selected.id}-purpose-${idx}`}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Passengers</p>
                <ul className="list-disc list-inside space-y-1">
                  {selected.authorizedPassengers?.map((p, idx) => (
                    <li key={`${selected.id}-passenger-${idx}`}>{p.name}</li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold">Approving Authority</p>
                  <p>{selected.approvingAuthorityName}</p>
                  {selected.authorityPrefix && <p className="text-xs text-gray-500">{selected.authorityPrefix}</p>}
                </div>
                <div>
                  <p className="font-semibold">Recommending Officer</p>
                  <p>{selected.recommendingOfficerName}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Decision</p>
                <div className="flex gap-2">
                  <Button
                    variant={decision === 'approve' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setDecision('approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant={decision === 'reject' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setDecision('reject')}
                  >
                    Reject
                  </Button>
                  {pdfData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => previewTripTicketPDF(pdfData, selected.serialNumber || 'DRAFT', selected.driverName || 'Driver')}
                    >
                      Preview PDF
                    </Button>
                  )}
                </div>
                <Textarea
                  rows={3}
                  placeholder={decision === 'reject' ? 'Enter rejection reason' : 'Comments (optional)'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  required={decision === 'reject'}
                />
              </div>
            </div>
          }
          onClose={() => {
            setSelected(null);
            setDecision(null);
            setComments('');
            setControlMode('auto');
            setControlInput('');
          }}
          actions={[
            {
              label: 'Close',
              variant: 'outline',
              onClick: () => {
                setSelected(null);
                setDecision(null);
                setComments('');
                setControlMode('auto');
                setControlInput('');
              },
            },
            {
              label: decision === 'reject' ? 'Reject' : 'Approve',
              variant: decision === 'reject' ? 'destructive' : 'primary',
              onClick: handleDecision,
              disabled: !decision || (decision === 'reject' && !comments.trim()) || isActing,
              isLoading: isActing,
            },
          ]}
        />
      )}
    </div>
  );
}
