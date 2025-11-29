import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { FuelRequisition } from '@/types';
import { useUser } from '@/stores/authStore';

interface FuelRequisitionDetailsProps {
  requisition: FuelRequisition;
  setView: (view: string) => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_EMD: 'bg-amber-100 text-amber-700',
  EMD_VALIDATED: 'bg-blue-100 text-blue-700',
  PENDING_ISSUANCE: 'bg-indigo-100 text-indigo-700',
  RIS_ISSUED: 'bg-purple-100 text-purple-700',
  AWAITING_RECEIPT: 'bg-cyan-100 text-cyan-700',
  RECEIPT_SUBMITTED: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  RETURNED: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_EMD: 'Pending EMD',
  EMD_VALIDATED: 'EMD Validated',
  PENDING_ISSUANCE: 'Pending Issuance',
  RIS_ISSUED: 'RIS Issued',
  AWAITING_RECEIPT: 'Awaiting Receipt',
  RECEIPT_SUBMITTED: 'Receipt Submitted',
  COMPLETED: 'Completed',
  RETURNED: 'Returned',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function FuelRequisitionDetails({ requisition, setView }: FuelRequisitionDetailsProps) {
  const user = useUser();

  const canValidate = user?.role === 'emd' && (requisition.status === 'PENDING_EMD' || requisition.status === 'RETURNED');
  const canIssue = user?.role === 'spms' && requisition.status === 'EMD_VALIDATED';
  const canSubmitReceipt = user?.role === 'driver' && (requisition.status === 'RIS_ISSUED' || requisition.status === 'AWAITING_RECEIPT');
  const canVerifyReceipt = user?.role === 'emd' && requisition.status === 'RECEIPT_SUBMITTED';

  return (
    <Card className="shadow-lg border-0 h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Requisition Details</CardTitle>
          <Badge className={statusColors[requisition.status]}>
            {statusLabels[requisition.status] || requisition.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-5 overflow-y-auto flex-1">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {canValidate && <Button onClick={() => setView('validate')}>Validate</Button>}
          {canIssue && <Button onClick={() => setView('issue')}>Issue RIS</Button>}
          {canSubmitReceipt && <Button onClick={() => setView('submit-receipt')}>Submit Receipt</Button>}
          {canVerifyReceipt && <Button onClick={() => setView('verify-receipt')}>Verify Receipt</Button>}
        </div>

        {/* Reference Numbers */}
        {(requisition.risNumber || requisition.refNumber) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {requisition.risNumber && (
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-xs text-blue-600 uppercase font-semibold mb-1">RIS Number</p>
                <p className="font-semibold text-blue-900">{requisition.risNumber}</p>
              </div>
            )}
            {requisition.refNumber && (
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Reference Number</p>
                <p className="font-semibold text-gray-900">RP-{String(requisition.refNumber).padStart(6, '0')}</p>
              </div>
            )}
          </div>
        )}

        {/* Basic Information - Compact View */}
        <div className="space-y-2 text-sm">
          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Created:</span>
            <span className="text-gray-900">
              {requisition.createdAt ? new Date(requisition.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
              }) : '—'}
            </span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Supplier:</span>
            <span className="text-gray-900">{requisition.supplierName || '—'}</span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Requested:</span>
            <span className="text-gray-900">{requisition.requestedLiters} L</span>
          </div>

          {requisition.validatedLiters && (
            <div className="flex items-start border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-600 min-w-[120px]">Validated:</span>
              <span className="text-gray-900">{requisition.validatedLiters} L</span>
            </div>
          )}

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">From:</span>
            <span className="text-gray-900">
              {requisition.inclusiveDateFrom ? new Date(requisition.inclusiveDateFrom).toLocaleDateString() : '—'}
            </span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">To:</span>
            <span className="text-gray-900">
              {requisition.inclusiveDateTo ? new Date(requisition.inclusiveDateTo).toLocaleDateString() : '—'}
            </span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Destination:</span>
            <span className="text-gray-900">{requisition.destination}</span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Purpose:</span>
            <span className="text-gray-900">
              {requisition.purpose?.split('\n').filter((p: string) => p.trim()).join('; ') || '—'}
            </span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Passengers:</span>
            <span className="text-gray-900">{requisition.passengers}</span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Vehicle:</span>
            <span className="text-gray-900">{requisition.dpwhNumber} - {requisition.plateNumber}</span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Driver:</span>
            <span className="text-gray-900">{requisition.driverName}</span>
          </div>

          <div className="flex items-start border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600 min-w-[120px]">Office:</span>
            <span className="text-gray-900">{requisition.officeName || '—'}</span>
          </div>

          {requisition.contractNumber && (
            <div className="flex items-start border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-600 min-w-[120px]">Contract:</span>
              <span className="text-gray-900">{requisition.contractNumber}</span>
            </div>
          )}

          {requisition.actualLiters && (
            <div className="flex items-start border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-600 min-w-[120px]">Actual Liters:</span>
              <span className="text-gray-900">{requisition.actualLiters} L</span>
            </div>
          )}

          {requisition.priceAtPurchase && (
            <div className="flex items-start border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-600 min-w-[120px]">Price per Liter:</span>
              <span className="text-gray-900">₱{requisition.priceAtPurchase.toFixed(2)}</span>
            </div>
          )}

          {requisition.totalAmount && (
            <div className="flex items-start border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-600 min-w-[120px]">Total Amount:</span>
              <span className="text-gray-900">₱{requisition.totalAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Receipt Details (if submitted) */}
        {(requisition.chargeInvoiceNumber || requisition.refuelDate || requisition.odometerAtRefuel) && (
          <div>
            <h3 className="text-md font-semibold mb-3 text-gray-700">Receipt Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {requisition.chargeInvoiceNumber && (
                <div>
                  <p className="text-gray-500 mb-1">Charge Invoice Number</p>
                  <p className="font-medium text-gray-900">{requisition.chargeInvoiceNumber}</p>
                </div>
              )}
              {requisition.chargeInvoiceDate && (
                <div>
                  <p className="text-gray-500 mb-1">Invoice Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(requisition.chargeInvoiceDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {requisition.refuelDate && (
                <div>
                  <p className="text-gray-500 mb-1">Refuel Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(requisition.refuelDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {requisition.odometerAtRefuel && (
                <div>
                  <p className="text-gray-500 mb-1">Odometer Reading</p>
                  <p className="font-medium text-gray-900">{requisition.odometerAtRefuel.toLocaleString()} km</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation/Approval Details */}
        {(requisition.emdValidatedByName || requisition.issuedByName || requisition.verifiedByName) && (
          <div>
            <h3 className="text-md font-semibold mb-3 text-gray-700">Processing History</h3>
            <div className="space-y-3 text-sm">
              {requisition.emdValidatedByName && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">EMD Validated By</p>
                  <p className="font-medium text-gray-900">{requisition.emdValidatedByName}</p>
                  {requisition.emdValidatedAt && (
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(requisition.emdValidatedAt).toLocaleString()}
                    </p>
                  )}
                  {requisition.emdRemarks && (
                    <p className="text-xs text-gray-700 mt-2 italic">"{requisition.emdRemarks}"</p>
                  )}
                </div>
              )}
              {requisition.issuedByName && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">RIS Issued By</p>
                  <p className="font-medium text-gray-900">{requisition.issuedByName}</p>
                  {requisition.issuedAt && (
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(requisition.issuedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {requisition.verifiedByName && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Receipt Verified By</p>
                  <p className="font-medium text-gray-900">{requisition.verifiedByName}</p>
                  {requisition.verifiedAt && (
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(requisition.verifiedAt).toLocaleString()}
                    </p>
                  )}
                  {requisition.verificationRemarks && (
                    <p className="text-xs text-gray-700 mt-2 italic">"{requisition.verificationRemarks}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
