import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  updateDoc,
  serverTimestamp,
  runTransaction,
  addDoc,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';

type ReservedItem = {
  id: string;
  serialNumberReserved: string;
  referenceId?: string;
  destination?: string;
  status?: string;
  ticketId?: string;
  approvedSerial?: string;
};

export function ControlNumberManager() {
  const user = useUser();
  const [nextBase, setNextBase] = useState<number | null>(null);
  const [reserved, setReserved] = useState<ReservedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [controlInput, setControlInput] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const year = new Date().getFullYear();

  const suggestions = useMemo(() => {
    if (nextBase === null) return [];
    return Array.from({ length: 10 }).map((_, idx) => `DTT-${year}-${String(nextBase + idx + 1).padStart(4, '0')}`);
  }, [nextBase, year]);

  const loadData = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      // Load counter hint
      const counterSnap = await getDocs(query(collection(db, 'serial_numbers'), where('__name__', '==', `dtt-${year}`)));
      const counterDoc = counterSnap.docs.find((d) => d.id === `dtt-${year}`);
      setNextBase(counterDoc ? (counterDoc.data() as any).counter || 0 : 0);

      // Load standalone reservations in this org
      const reservationsSnap = await getDocs(
        query(collection(db, 'serial_reservations'), where('organizationId', '==', user.organizationId), orderBy('reservedAt', 'desc'))
      );
      const reservedRows: ReservedItem[] = reservationsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          serialNumberReserved: data.controlNumber,
          referenceId: data.ticketReferenceId,
          destination: data.destination,
          status: data.status || 'reserved',
          ticketId: data.ticketId,
        };
      });

      // Include ticket-based reservations
      const ticketsReservedSnap = await getDocs(
        query(
          collection(db, 'trip_tickets'),
          where('organizationId', '==', user.organizationId),
          where('serialNumberReserved', '!=', null),
          orderBy('serialNumberReserved')
        )
      );
      ticketsReservedSnap.docs.forEach((d) => {
        const data = d.data() as any;
        reservedRows.push({
          id: d.id,
          serialNumberReserved: data.serialNumberReserved,
          referenceId: data.referenceId,
          destination: data.destination,
          status: data.status || 'pending_approval',
          ticketId: d.id,
        });
      });

      // Include approved tickets with assigned serials (not necessarily reserved)
      const ticketsApprovedSnap = await getDocs(
        query(
          collection(db, 'trip_tickets'),
          where('organizationId', '==', user.organizationId),
          where('serialNumber', '!=', null),
          orderBy('serialNumber')
        )
      );
      ticketsApprovedSnap.docs.forEach((d) => {
        const data = d.data() as any;
        reservedRows.push({
          id: d.id,
          serialNumberReserved: data.serialNumber || '',
          referenceId: data.referenceId,
          destination: data.destination,
          status: data.status || 'approved',
          ticketId: d.id,
          approvedSerial: data.serialNumber,
        });
      });

      setReserved(reservedRows);
    } catch (err) {
      console.error('Failed to load control numbers', err);
      setReserved([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const bumpCounterIfNeeded = async (targetYear: number, num: number) => {
    const counterRef = doc(db, 'serial_numbers', `dtt-${targetYear}`);
    await runTransaction(db, async (trx) => {
      const snap = await trx.get(counterRef);
      const current = snap.exists() ? snap.data().counter || 0 : 0;
      const next = Math.max(current, num);
      trx.set(counterRef, { counter: next, year: targetYear }, { merge: true });
    });
  };

  const handleReserve = async () => {
    const parsed = parseControl(controlInput);
    if (!parsed) {
      setToast({ type: 'error', text: 'Invalid control number. Use DTT-YYYY-NNNN.' });
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setReserveLoading(true);
    try {
      const available = await checkControlAvailable(parsed.formatted);
      if (!available) throw new Error('Control number already used or reserved.');
      await bumpCounterIfNeeded(parsed.year, parsed.num);
      await addDoc(collection(db, 'serial_reservations'), {
        controlNumber: parsed.formatted,
        organizationId: user?.organizationId,
        reservedBy: user?.id || null,
        reservedAt: serverTimestamp(),
        status: 'reserved',
      });
      setToast({ type: 'success', text: `Reserved ${parsed.formatted}` });
      setControlInput('');
      await loadData();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reserve control number.' });
    } finally {
      setReserveLoading(false);
      setTimeout(() => setToast(null), 2200);
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-xl">DTT Control Numbers</CardTitle>
          <p className="text-sm text-gray-600">Next available and reserved numbers</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">Next available</p>
            {nextBase !== null && (
              <span className="text-xs text-gray-500">Current counter: {String(nextBase).padStart(4, '0')}</span>
            )}
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-500">No suggestions available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setControlInput(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold text-gray-900">Reserve (standalone)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="DTT-YYYY-NNNN"
                value={controlInput}
                onChange={(e) => setControlInput(e.target.value.toUpperCase())}
                className="sm:w-48"
              />
              <Button variant="primary" size="sm" onClick={handleReserve} isLoading={reserveLoading}>
                Reserve
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Holds a control number for later use; you can type it during approval.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">Reserved</p>
            <span className="text-xs text-gray-500">Pending assignments</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="text-xs uppercase text-gray-500 border-b">
                  <th className="px-2 py-2">Control No.</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Reference / Destination</th>
                  <th className="px-2 py-2">Linked Ticket</th>
                  <th className="px-2 py-2">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reserved.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-sm text-gray-500 text-center">
                      No reserved control numbers.
                    </td>
                  </tr>
                ) : (
                  reserved.map((r) => (
                    <tr key={r.id} className="text-gray-800">
                      <td className="px-2 py-2 font-semibold text-amber-800">{r.serialNumberReserved}</td>
                      <td className="px-2 py-2">
                        <Badge variant="warning" className="text-xs">
                          {r.status || 'pending'}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700">
                        {r.referenceId ? `Ref: ${r.referenceId}` : 'Unlinked'}
                        {r.destination ? ` • ${r.destination}` : ''}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700">{r.ticketId || '—'}</td>
                      <td className="px-2 py-2 text-xs text-gray-700">
                        {r.approvedSerial ? 'Assigned' : r.ticketId ? 'Ticket Reserved' : 'Standalone Reserved'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-lg shadow-lg px-4 py-3 text-sm text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.text}
        </div>
      )}
    </Card>
  );
}
