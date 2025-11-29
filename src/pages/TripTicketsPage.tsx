import { useMemo, useState, useEffect } from 'react';
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
import { addDoc, collection, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type TripTab = 'create' | 'my' | 'all' | 'approvals' | 'controls';

export function TripTicketsPage() {
  const user = useUser();
  const [modal, setModal] = useState<{ open: boolean; message: string; status?: 'pending_approval'; referenceId?: string }>({ open: false, message: '' });
  const [pendingCount, setPendingCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Set default tab based on user role
  const defaultTab = user?.role === 'spms' ? 'approvals' : 'create';
  const [activeTab, setActiveTab] = useState<TripTab>(defaultTab);

  // Load trip ticket stats
  useEffect(() => {
    if (!user?.organizationId) return;

    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        // Count pending approvals
        const pendingQuery = query(
          collection(db, 'trip_tickets'),
          where('organizationId', '==', user.organizationId),
          where('status', '==', 'pending_approval')
        );
        const pendingSnap = await getDocs(pendingQuery);
        setPendingCount(pendingSnap.size);

        // Count scheduled departures in next 48 hours
        const now = new Date();
        const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const scheduledQuery = query(
          collection(db, 'trip_tickets'),
          where('organizationId', '==', user.organizationId),
          where('status', 'in', ['approved', 'in_progress'])
        );
        const scheduledSnap = await getDocs(scheduledQuery);

        // Filter by departure date in next 48 hours
        const scheduled = scheduledSnap.docs.filter((doc) => {
          const data = doc.data();
          const departureDate = data.departureDate?.toDate?.() || null;
          if (!departureDate) return false;
          return departureDate >= now && departureDate <= next48Hours;
        });
        setScheduledCount(scheduled.length);
      } catch (error) {
        console.error('Failed to load trip ticket stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [user?.organizationId]);

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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-600 to-blue-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="uppercase text-xs font-semibold tracking-[0.15em] text-blue-100">
                Trip Tickets
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold mt-2 leading-tight">
                Driver&apos;s Trip Ticket workspace
              </h1>
              {user?.displayName && (
                <div className="flex items-center gap-2 mt-4 text-blue-100">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.displayName.toUpperCase()}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-6">
                {tabs.map((tab) => (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={activeTab === tab.key ? 'secondary' : 'ghost'}
                    onClick={() => setActiveTab(tab.key)}
                    className={
                      activeTab === tab.key
                        ? 'bg-white text-blue-700 hover:bg-blue-50 border-white px-4'
                        : 'bg-transparent border border-white/70 text-white hover:bg-white/10 px-4'
                    }
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur w-full max-w-sm">
              <p className="text-blue-100 text-sm font-medium mb-4">Trip Ticket Metrics</p>
              <div className="space-y-3">
                <div className="bg-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-amber-200" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-100">Pending Approvals</p>
                      <p className="text-2xl font-bold">{isLoadingStats ? '...' : pendingCount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-100 mt-1">SPMS queue</p>
                </div>
                <div className="bg-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-emerald-200" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-100">Scheduled Departures</p>
                      <p className="text-2xl font-bold">{isLoadingStats ? '...' : scheduledCount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-100 mt-1">Next 48 hours</p>
                </div>
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
