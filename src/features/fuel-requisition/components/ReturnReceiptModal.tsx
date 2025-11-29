import React, { useMemo, useState } from 'react';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FuelRequisition, User } from '@/types';
import { Button } from '@/components/ui/button';
import { FileX } from 'lucide-react';

interface ReturnReceiptModalProps {
  requisition: FuelRequisition;
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReturnReceiptModal: React.FC<ReturnReceiptModalProps> = ({
  requisition,
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [returnRemarks, setReturnRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedUpdatedAt = useMemo(
    () => (requisition?.updatedAt ? new Date(requisition.updatedAt).getTime() : null),
    [requisition?.updatedAt]
  );

  const handleReturn = async () => {
    if (!returnRemarks.trim()) {
      setError('Please enter a reason for returning this receipt.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requisitionRef = doc(db, 'fuel_requisitions', requisition.id);

      const currentSnap = await getDoc(requisitionRef);
      const currentUpdatedAt =
        currentSnap.data()?.updatedAt?.toMillis?.() ?? currentSnap.data()?.updatedAt?.getTime?.();
      if (loadedUpdatedAt && currentUpdatedAt && currentUpdatedAt !== loadedUpdatedAt) {
        setError('This receipt was already updated. Please refresh to see the latest data.');
        return;
      }

      await updateDoc(requisitionRef, {
        status: 'RECEIPT_RETURNED',
        receiptReturnedAt: serverTimestamp(),
        receiptReturnedBy: user.id,
        receiptReturnedByName: user.displayName,
        receiptReturnRemarks: returnRemarks.trim(),
        updatedAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to return receipt:', err);
      setError(err.message || 'Failed to return receipt. Please try again.');
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
              <FileX className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Return Receipt to Driver</h3>
              <p className="text-sm text-gray-500">Request driver to re-upload receipt</p>
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
                <span className="font-medium text-gray-600">Invoice Number:</span>
                <p className="text-gray-900">{requisition.chargeInvoiceNumber || '—'}</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The driver will be notified to re-upload the receipt. They can correct the invoice details or upload a clearer image.
            </p>
          </div>

          {/* Return Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Returning <span className="text-red-500">*</span>
            </label>
            <textarea
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              rows={3}
              placeholder="e.g., Receipt image unclear, Invoice number doesn't match RIS, Liters don't match, etc."
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
            onClick={handleReturn}
            disabled={isSubmitting || !returnRemarks.trim()}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isSubmitting ? 'Returning...' : 'Return Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReturnReceiptModal;
