import { useMemo, useState } from 'react';
import { ClipboardCheck, Clock3, FileText, MapPin, User } from 'lucide-react';
import { TripTicketForm } from '@/features/trip-tickets/components/TripTicketForm';
import { TripTicketList } from '@/features/trip-tickets/components/TripTicketList';
import { MyTripsPage } from '@/features/trip-tickets/pages/MyTripsPage';
import { TripTicketApprovals } from '@/features/trip-tickets/components/TripTicketApprovals';
import { ControlNumberManager } from '@/features/trip-tickets/components/ControlNumberManager';
import { previewTripTicketPDF } from '@/lib/pdf-generator';
import { useUser } from '@/stores/authStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal, Button } from '@/components/ui';
import type { TripTicketFormData } from '@/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ticketStats = [
  { label: 'Pending approvals', value: '4', detail: 'SPMS queue', icon: ClipboardCheck, tone: 'bg-amber-50 text-amber-700' },
  { label: 'Scheduled departures', value: '5', detail: 'Next 48 hours', icon: Clock3, tone: 'bg-emerald-50 text-emerald-700' },
];

type TripTab = 'create' | 'my' | 'all' | 'approvals' | 'controls';

export function TripTicketsPage() {
  const user = useUser();
  const [modal, setModal] = useState<{ open: boolean; message: string; status?: 'pending_approval'; referenceId?: string }>({ open: false, message: '' });

  // Set default tab based on user role
  const defaultTab = user?.role === 'spms' ? 'approvals' : 'create';
  const [activeTab, setActiveTab] = useState<TripTab>(defaultTab);

  const tabs = useMemo(() => {
    const items: { key: TripTab; label: string }[] = [];

    // Only drivers and admins can create trip tickets
    if (user?.role === 'driver' || user?.role === 'admin') {
      items.push({ key: 'create', label: 'Create' });
    }

    if (user?.role === 'driver') {
      items.push({ key: 'my', label: 'My Trips' });
    }

    if (user?.role === 'admin' || user?.role === 'spms') {
      items.push({ key: 'all', label: 'All Trips' });
    }

    if (user?.role === 'spms') {
      items.push({ key: 'approvals', label: 'Pending Approvals' });
      items.push({ key: 'controls', label: 'Control Numbers' });
    }

    return items;
  }, [user?.role]);

  const handleSubmit = async (data: TripTicketFormData & { status?: 'pending_approval' }) => {
    if (!user?.id || !user?.organizationId) {
      setModal({ open: true, message: 'Cannot save trip ticket: missing user context.' });
      return;
    }

    const status: 'pending_approval' = 'pending_approval';
    const now = new Date();
    const year = now.getFullYear();
    const randomPart = Math.random().toString().slice(2, 6);
    const referenceId = `REF-${year}-${randomPart}`;
    const payload = {
      ...data,
      status,
      driverId: user.id,
      driverName: user.displayName,
      organizationId: user.organizationId,
      referenceId,
      pdfAvailable: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any;

    try {
      const docRef = await addDoc(collection(db, 'trip_tickets'), payload);

      await addDoc(collection(db, 'notifications'), {
        type: 'trip_ticket_pending',
        message: `Trip ticket awaiting approval: ${referenceId}`,
        role: 'spms',
        organizationId: user.organizationId,
        tripTicketId: docRef.id,
        createdAt: serverTimestamp(),
        read: false,
      });

      await addDoc(collection(db, 'audit_logs'), {
        action: 'trip_ticket_submitted',
        actorId: user.id,
        actorName: user.displayName,
        tripTicketId: docRef.id,
        referenceId,
        status,
        timestamp: serverTimestamp(),
        meta: {
          divisionOffice: data.divisionOffice,
          destination: data.destination,
        },
      });

      setModal({
        open: true,
        message: `Trip ticket submitted.\nAwaiting SPMS approval.`,
        status,
        referenceId,
      });
    } catch (err) {
      console.error('Failed to save trip ticket', err);
      setModal({ open: true, message: 'Failed to save trip ticket. Please try again.' });
    }
  };

  const handleGeneratePDF = (data: TripTicketFormData) => {
    previewTripTicketPDF(data, 'DTT-2025-11-001', user?.displayName || 'Driver');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 bg-white">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">Trip Tickets</p>
                  <h1 className="text-xl font-bold text-gray-900 mt-0.5">
                    Driver&apos;s Trip Ticket workspace
                  </h1>
                  {user?.displayName && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{user.displayName}</span>
                    </div>
                  )}
                </div>
              </div>

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
          </div>
        </section>

        <div className="w-full">
          {activeTab === 'create' && <TripTicketForm onSubmit={handleSubmit} onGeneratePDF={handleGeneratePDF} />}
          {activeTab === 'my' && <MyTripsPage />}
          {activeTab === 'all' && <TripTicketList />}
          {activeTab === 'approvals' && <TripTicketApprovals />}
          {activeTab === 'controls' && user?.role === 'spms' && <ControlNumberManager />}
        </div>
      </div>
      <Modal
        open={modal.open}
        title="Trip Ticket"
        description={
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              {modal.status === 'draft' ? (
                <p><span className="font-semibold text-amber-700">Draft saved.</span></p>
              ) : (
                <>
                  <p><span className="font-semibold text-emerald-700">Trip ticket submitted.</span></p>
                  <p className="text-gray-600">Awaiting SPMS approval.</p>
                </>
              )}
            </div>
            {modal.referenceId && (
              <div className="text-sm">
                <span className="text-gray-600">Reference ID: </span>
                <span className="font-bold text-indigo-700">{modal.referenceId}</span>
              </div>
            )}
          </div>
        }
        onClose={() => setModal({ open: false, message: '' })}
      />
    </DashboardLayout>
  );
}
