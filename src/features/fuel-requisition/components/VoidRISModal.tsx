import React, { useMemo, useState } from 'react';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FuelRequisition, User } from '@/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface VoidRISModalProps {
  requisition: FuelRequisition;
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VoidRISModal: React.FC<VoidRISModalProps> = ({
  requisition,
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [voidReason, setVoidReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedUpdatedAt = useMemo(
    () => (requisition?.updatedAt ? new Date(requisition.updatedAt).getTime() : null),
    [requisition?.updatedAt]
  );

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      setError('Please enter a reason for voiding this RIS.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requisitionRef = doc(db, 'fuel_requisitions', requisition.id);

      // Concurrency protection
      const currentSnap = await getDoc(requisitionRef);
      const currentUpdatedAt =
        currentSnap.data()?.updatedAt?.toMillis?.() ?? currentSnap.data()?.updatedAt?.getTime?.();
      if (loadedUpdatedAt && currentUpdatedAt && currentUpdatedAt !== loadedUpdatedAt) {
        setError('This requisition was updated by another user. Please refresh and try again.');
        return;
      }

      await updateDoc(requisitionRef, {
        status: 'CANCELLED',
        voidedAt: serverTimestamp(),
        voidedBy: user.id,
        voidedByName: user.displayName,
        voidReason: voidReason.trim(),
        updatedAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to void RIS:', err);
      setError(err.message || 'Failed to void RIS. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Void RIS</h3>
              <p className="text-sm text-gray-500">This action will cancel the issued RIS</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* RIS Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">RIS Number:</span>
                <p className="font-mono text-gray-900">{requisition.risNumber}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Ref Number:</span>
                <p className="font-mono text-gray-900">
                  FR-{String(requisition.refNumber).padStart(6, '0')}
                </p>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Driver:</span>
                <p className="text-gray-900">{requisition.driverName}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Vehicle:</span>
                <p className="text-gray-900">{requisition.vehicleDescription}</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This will cancel the RIS. The driver will need to create a new fuel request.
            </p>
          </div>

          {/* Void Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Voiding <span className="text-red-500">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={3}
              placeholder="e.g., Wrong vehicle assigned, Incorrect liters, etc."
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVoid}
            disabled={isSubmitting || !voidReason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? 'Voiding...' : 'Void RIS'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoidRISModal;
