import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, addDoc, serverTimestamp, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { Fuel, FileText, User } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui';
import { FuelRequestForm } from '@/features/fuel-requisition/components/FuelRequestForm';
import { FuelRequestList } from '@/features/fuel-requisition/components/FuelRequestList';
import { FuelValidationForm } from '@/features/fuel-requisition/components/FuelValidationForm';
import { FuelIssuanceForm } from '@/features/fuel-requisition/components/FuelIssuanceForm';
import { ReceiptVerificationForm } from '@/features/fuel-requisition/components/ReceiptVerificationForm';
import { ReceiptSubmissionForm } from '@/features/fuel-requisition/components/ReceiptSubmissionForm';
import { FuelRequisitionDetails } from '@/features/fuel-requisition/components/FuelRequisitionDetails';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { FuelRequisition, Contract } from '@/types';

type FuelTab = 'create' | 'my-requests' | 'pending-validation' | 'pending-verification' | 'pending-issuance' | 'all-requests';

export function FuelRequisitionsPage() {
  const user = useUser();
  const [requisitions, setRequisitions] = useState<FuelRequisition[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<FuelRequisition | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [requisitionToCancel, setRequisitionToCancel] = useState<FuelRequisition | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set default tab based on user role
  const defaultTab = useMemo(() => {
    if (user?.role === 'driver') return 'create';
    if (user?.role === 'emd') return 'pending-validation';
    if (user?.role === 'spms') return 'pending-issuance';
    return 'all-requests';
  }, [user?.role]);

  const [activeTab, setActiveTab] = useState<FuelTab>(defaultTab);

  // Define available tabs based on user role
  const tabs = useMemo(() => {
    const items: { key: FuelTab; label: string }[] = [];

    if (user?.role === 'driver' || user?.role === 'admin') {
      items.push({ key: 'create', label: 'Create Request' });
    }

    if (user?.role === 'driver') {
      items.push({ key: 'my-requests', label: 'My Requests' });
    }

    if (user?.role === 'emd' || user?.role === 'admin') {
      items.push({ key: 'pending-validation', label: 'Pending Validation' });
      items.push({ key: 'pending-verification', label: 'Pending Verification' });
    }

    if (user?.role === 'spms' || user?.role === 'admin') {
      items.push({ key: 'pending-issuance', label: 'Pending Issuance' });
    }

    if (user?.role === 'admin' || user?.role === 'spms') {
      items.push({ key: 'all-requests', label: 'All Requests' });
    }

    return items;
  }, [user?.role]);

  // Load requisitions based on active tab
  useEffect(() => {
    if (!user) return;

    const loadRequisitions = async () => {
      setIsLoading(true);
      try {
        let q;

        switch (activeTab) {
          case 'create':
            setRequisitions([]);
            setIsLoading(false);
            return;

          case 'my-requests':
            q = query(
              collection(db, 'fuel_requisitions'),
              where('createdBy', '==', user.id),
              where('organizationId', '==', user.organizationId),
              orderBy('createdAt', 'desc')
            );
            break;

          case 'pending-validation':
            q = query(
              collection(db, 'fuel_requisitions'),
              where('status', 'in', ['PENDING_EMD', 'RETURNED']),
              where('organizationId', '==', user.organizationId),
              orderBy('createdAt', 'asc')
            );
            break;

          case 'pending-verification':
            q = query(
              collection(db, 'fuel_requisitions'),
              where('status', '==', 'RECEIPT_SUBMITTED'),
              where('organizationId', '==', user.organizationId),
              orderBy('createdAt', 'asc')
            );
            break;

          case 'pending-issuance':
            q = query(
              collection(db, 'fuel_requisitions'),
              where('status', '==', 'EMD_VALIDATED'),
              where('organizationId', '==', user.organizationId),
              orderBy('createdAt', 'asc')
            );
            break;

          case 'all-requests':
            q = query(
              collection(db, 'fuel_requisitions'),
              where('organizationId', '==', user.organizationId),
              orderBy('createdAt', 'desc')
            );
            break;

          default:
            setRequisitions([]);
            setIsLoading(false);
            return;
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            inclusiveDateFrom: docData.inclusiveDateFrom?.toDate?.() || new Date(),
            inclusiveDateTo: docData.inclusiveDateTo?.toDate?.() || new Date(),
            createdAt: docData.createdAt?.toDate?.() || new Date(),
            updatedAt: docData.updatedAt?.toDate?.() || new Date(),
            issuedAt: docData.issuedAt?.toDate?.() || null,
            verifiedAt: docData.verifiedAt?.toDate?.() || null,
            validUntil: docData.validUntil?.toDate?.() || null,
            chargeInvoiceDate: docData.chargeInvoiceDate?.toDate?.() || null,
            refuelDate: docData.refuelDate?.toDate?.() || null,
            emdValidatedAt: docData.emdValidatedAt?.toDate?.() || null,
          } as FuelRequisition;
        });

        setRequisitions(data);
      } catch (error) {
        console.error('Failed to load requisitions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequisitions();
  }, [activeTab, user, refreshTrigger]);

  // Load contracts
  useEffect(() => {
    if (!user) return;

    const loadContracts = async () => {
      try {
        const q = query(
          collection(db, 'contracts'),
          where('organizationId', '==', user.organizationId)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Contract));
        setContracts(data);
      } catch (error) {
        console.error('Failed to load contracts:', error);
      }
    };

    loadContracts();
  }, [user]);

  const handleViewRequest = (req: FuelRequisition) => {
    setSelectedRequisition(req);
    setShowDetailsModal(true);
  };

  const handleCancelClick = (req: FuelRequisition) => {
    setRequisitionToCancel(req);
    setShowCancelModal(true);
  };

  const handleCreateRequest = async (data: any) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Generate reference number (auto-increment counter)
      const counterRef = doc(db, 'counters', 'fuel_requisition_ref');
      const counterSnap = await getDoc(counterRef);

      let newRefNumber = 1;
      if (counterSnap.exists()) {
        newRefNumber = (counterSnap.data().lastNumber || 0) + 1;
      }

      // Update counter
      await setDoc(counterRef, {
        lastNumber: newRefNumber,
        updatedAt: serverTimestamp()
      });

      // Map field names correctly for Firestore
      const requisitionData = {
        // RIS Number (generated when issued)
        risNumber: null,
        refNumber: newRefNumber, // Auto-generated reference number

        // Office & Signatories
        officeId: data.officeId,
        officeName: data.officeName || '',
        requestingOfficerId: data.requestingOfficerId,
        requestingOfficerName: data.requestingOfficerName,
        requestingOfficerPosition: data.requestingOfficerPosition,
        approvingAuthorityId: data.approvingAuthorityId,
        approvingAuthorityName: data.approvingAuthorityName,
        approvingAuthorityPosition: data.approvingAuthorityPosition,
        authorityPrefix: data.authorityPrefix || 'By Authority of the Regional Director:',
        issuanceSignatoryId: null,
        issuanceSignatoryName: null,
        issuanceSignatoryPosition: null,

        // Vehicle & Driver
        vehicleId: data.vehicleId,
        dpwhNumber: data.vehicleDpwhNumber || '',
        vehicleDescription: data.vehicleDescription || '',
        plateNumber: data.vehiclePlateNumber || '',
        fuelType: data.fuelType || 'DIESEL',
        driverId: user.id,
        driverName: user.displayName,

        // Trip Details
        passengers: data.passengers,
        inclusiveDateFrom: Timestamp.fromDate(new Date(data.inclusiveDateFrom)),
        inclusiveDateTo: Timestamp.fromDate(new Date(data.inclusiveDateTo)),
        destination: data.destination,
        purpose: data.purpose,

        // Fuel Request
        requestedLiters: data.requestedLiters,
        validatedLiters: null,
        actualLiters: null,

        // Contract & Pricing
        contractId: null,
        contractNumber: null,
        supplierId: data.supplierId || null,
        supplierName: data.supplierName || null,
        priceAtIssuance: null,
        priceAtPurchase: null,
        totalAmount: null,

        // Validity
        validUntil: null,

        // Status
        status: 'PENDING_EMD',

        // EMD Validation
        emdValidatedBy: null,
        emdValidatedByName: null,
        emdValidatedAt: null,
        emdRemarks: null,

        // SPMS Issuance
        issuedBy: null,
        issuedByName: null,
        issuedAt: null,

        // Last Issuance Info
        lastIssuance: null,

        // Receipt Submission
        chargeInvoiceNumber: null,
        chargeInvoiceDate: null,
        receiptImageBase64: null,
        refuelDate: null,
        odometerAtRefuel: null,

        // Image Archive Status
        imageArchivedAt: null,

        // Receipt Verification
        verifiedBy: null,
        verifiedByName: null,
        verifiedAt: null,
        verificationRemarks: null,

        // Metadata
        createdBy: user.id,
        createdByName: user.displayName,
        organizationId: user.organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'fuel_requisitions'), requisitionData);

      // Show success message
      setSuccessMessage('Fuel request created successfully!');
      setShowSuccessModal(true);

      // Switch to my requests tab (will trigger data reload via useEffect)
      if (user.role === 'driver') {
        setActiveTab('my-requests');
      } else {
        setActiveTab('all-requests');
      }
    } catch (error) {
      console.error('Failed to create fuel request:', error);
      setSuccessMessage('Failed to create fuel request. Please try again.');
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!requisitionToCancel || !user) return;

    setIsSubmitting(true);
    setShowCancelModal(false);

    try {
      await updateDoc(doc(db, 'fuel_requisitions', requisitionToCancel.id), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
        cancelledBy: user.id,
        cancelledByName: user.displayName,
        updatedAt: serverTimestamp(),
      });

      // Show success message
      setSuccessMessage('Fuel request cancelled successfully!');
      setShowSuccessModal(true);

      // Force reload by incrementing refresh trigger
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to cancel request:', error);
      setSuccessMessage('Failed to cancel request. Please try again.');
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
      setRequisitionToCancel(null);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return <FuelRequestForm onSubmit={handleCreateRequest} isSubmitting={isSubmitting} />;

      case 'my-requests':
      case 'all-requests':
        return (
          <FuelRequestList
            requests={requisitions}
            isLoading={isLoading}
            onView={handleViewRequest}
            onCancel={handleCancelClick}
          />
        );

      case 'pending-validation':
        return selectedRequisition ? (
          <FuelValidationForm
            requisition={selectedRequisition}
            contracts={contracts}
            onBack={() => setSelectedRequisition(null)}
            onSuccess={() => {
              setSelectedRequisition(null);
              setActiveTab((prev) => prev); // Reload
            }}
          />
        ) : (
          <FuelRequestList
            requests={requisitions}
            isLoading={isLoading}
            onView={(req) => setSelectedRequisition(req)}
          />
        );

      case 'pending-verification':
        return selectedRequisition ? (
          <ReceiptVerificationForm
            requisition={selectedRequisition}
            onBack={() => setSelectedRequisition(null)}
            onSuccess={() => {
              setSelectedRequisition(null);
              setActiveTab((prev) => prev); // Reload
            }}
          />
        ) : (
          <FuelRequestList
            requests={requisitions}
            isLoading={isLoading}
            onView={(req) => setSelectedRequisition(req)}
          />
        );

      case 'pending-issuance':
        return selectedRequisition ? (
          <FuelIssuanceForm
            requisition={selectedRequisition}
            contracts={contracts}
            onBack={() => setSelectedRequisition(null)}
            onSuccess={() => {
              setSelectedRequisition(null);
              setActiveTab((prev) => prev); // Reload
            }}
          />
        ) : (
          <FuelRequestList
            requests={requisitions}
            isLoading={isLoading}
            onView={(req) => setSelectedRequisition(req)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="uppercase text-xs font-semibold tracking-[0.15em] text-emerald-100">
                DPWH Regional Office II
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold mt-2 leading-tight">
                Fuel Requisition Workspace
              </h1>
              {user?.displayName && (
                <div className="flex items-center gap-2 mt-4 text-emerald-100">
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
                        ? 'bg-white text-emerald-700 hover:bg-emerald-50 border-white px-4'
                        : 'bg-transparent border border-white/70 text-white hover:bg-white/10 px-4'
                    }
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="w-full">
          {renderContent()}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Fuel Request Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequisition(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <FuelRequisitionDetails
                requisition={selectedRequisition}
                setView={() => {}} // Empty function since we're in modal
              />
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequisition(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && requisitionToCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Cancel Fuel Request?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this fuel request? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false);
                  setRequisitionToCancel(null);
                }}
                disabled={isSubmitting}
              >
                No, Keep It
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {successMessage.includes('success') ? '✓ Success' : '✗ Error'}
            </h3>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <div className="flex justify-end">
              <Button onClick={() => setShowSuccessModal(false)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default FuelRequisitionsPage;
