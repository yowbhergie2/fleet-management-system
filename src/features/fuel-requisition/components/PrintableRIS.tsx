import type { FuelRequisition, Contract } from '@/types';
import { format } from 'date-fns';

interface PrintableRISProps {
  requisition: FuelRequisition;
  contract?: Contract | null;
}

const fmt = (value?: Date | null) => (value ? format(value, 'MMM dd, yyyy') : '—');

export function PrintableRIS({ requisition, contract }: PrintableRISProps) {
  return (
    <div className="p-6 bg-white text-gray-900 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">REQUISITION AND ISSUE SLIP</p>
          <h1 className="text-2xl font-bold">DPWH - Regional Office II</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">RIS No.: {requisition.risNumber || '—'}</p>
          <p className="text-xs text-gray-600">Date: {fmt(requisition.issuedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="border rounded-lg p-3">
          <p className="text-xs uppercase text-gray-500 font-semibold">Division/Office</p>
          <p className="font-semibold">{requisition.officeName}</p>
          <p className="text-xs text-gray-600 mt-1">Requesting Officer: {requisition.requestingOfficerName}</p>
          <p className="text-xs text-gray-600">Approving Authority: {requisition.approvingAuthorityName}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs uppercase text-gray-500 font-semibold">Vehicle & Driver</p>
          <p className="font-semibold">
            {requisition.dpwhNumber} • {requisition.plateNumber}
          </p>
          <p className="text-xs text-gray-600 mt-1">{requisition.vehicleDescription}</p>
          <p className="text-xs text-gray-600">Driver: {requisition.driverName}</p>
        </div>
      </div>

      <div className="border rounded-lg mb-4">
        <div className="px-3 py-2 border-b bg-gray-50 text-xs font-semibold uppercase text-gray-600">Requisition</div>
        <div className="p-3 text-sm grid grid-cols-4 gap-2">
          <div>
            <p className="text-xs text-gray-500">Stock No.</p>
            <p className="font-semibold">{requisition.supplierName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Unit</p>
            <p className="font-semibold">Liters</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Description</p>
            <p className="font-semibold">{requisition.fuelType}</p>
            <p className="text-xs text-gray-600">Passengers: {requisition.passengers}</p>
            <p className="text-xs text-gray-600">Destination: {requisition.destination}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Quantity</p>
            <p className="font-semibold">{requisition.validatedLiters || requisition.requestedLiters} L</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg mb-4 p-3 text-sm grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Contract No.</p>
          <p className="font-semibold">{requisition.contractNumber || '—'}</p>
          <p className="text-xs text-gray-600">
            Remaining Balance: {contract ? `${contract.remainingBalance.toLocaleString()} PHP` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Validity</p>
          <p className="font-semibold">
            {requisition.validUntil ? fmt(requisition.validUntil) : 'No expiry (until consumed)'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="border rounded-lg p-3">
          <p className="text-xs uppercase text-gray-500 font-semibold">Inclusive Dates</p>
          <p className="font-semibold">
            {fmt(requisition.inclusiveDateFrom)} to {fmt(requisition.inclusiveDateTo)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Purpose: {requisition.purpose}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs uppercase text-gray-500 font-semibold">Last Issuance</p>
          {requisition.lastIssuance ? (
            <>
              <p className="font-semibold">RIS {requisition.lastIssuance.risNumber}</p>
              <p className="text-xs text-gray-600">
                {fmt(requisition.lastIssuance.issuanceDate)} • {requisition.lastIssuance.quantity} L
              </p>
              <p className="text-xs text-gray-600">
                Station: {requisition.lastIssuance.station} | Invoice: {requisition.lastIssuance.chargeInvoice}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-600">No previous issuance found.</p>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-3 text-sm">
        <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Signatures</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SignatureBlock label="Checked as to quantity" name={requisition.emdValidatedByName} />
          <SignatureBlock label="Issued by" name={requisition.issuanceSignatoryName} />
          <SignatureBlock label="Requested by" name={requisition.requestingOfficerName} />
          <SignatureBlock label="Approved by" name={requisition.approvingAuthorityName} />
        </div>
        <div className="mt-6">
          <SignatureBlock label="Received by" name={requisition.driverName} />
        </div>
      </div>
    </div>
  );
}

function SignatureBlock({ label, name }: { label: string; name?: string | null }) {
  return (
    <div className="border-t border-gray-300 pt-4">
      <p className="text-sm font-semibold text-gray-900">{name || '________________'}</p>
      <p className="text-xs uppercase text-gray-500">{label}</p>
    </div>
  );
}

export default PrintableRIS;
