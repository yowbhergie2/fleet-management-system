import { useState, useMemo } from 'react';
import { FileText, Printer, Upload, XCircle, Eye, Calendar, Fuel, Building2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { FuelRequisition } from '@/types';

interface FuelRequestListProps {
  requests: FuelRequisition[];
  isLoading?: boolean;
  onView?: (request: FuelRequisition) => void;
  onPrintRIS?: (request: FuelRequisition) => void;
  onSubmitReceipt?: (request: FuelRequisition) => void;
  onCancel?: (request: FuelRequisition) => void;
}

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

export function FuelRequestList({
  requests,
  isLoading,
  onView,
  onPrintRIS,
  onSubmitReceipt,
  onCancel,
}: FuelRequestListProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    if (filterStatus === 'ALL') return requests;
    return requests.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(requests.map((r) => r.status));
    return Array.from(statuses).sort();
  }, [requests]);

  const canPrintRIS = (request: FuelRequisition) => {
    return request.status === 'RIS_ISSUED' || request.status === 'AWAITING_RECEIPT' || request.status === 'RECEIPT_SUBMITTED' || request.status === 'COMPLETED';
  };

  const canSubmitReceipt = (request: FuelRequisition) => {
    return request.status === 'RIS_ISSUED' || request.status === 'AWAITING_RECEIPT';
  };

  const canCancel = (request: FuelRequisition) => {
    return request.status === 'DRAFT' || request.status === 'PENDING_EMD' || request.status === 'RETURNED';
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            My Fuel Requests
          </CardTitle>
          <Badge variant="secondary">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterStatus === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({requests.length})
            </button>
            {uniqueStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterStatus === status ? statusColors[status] : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusLabels[status] || status} ({requests.filter((r) => r.status === status).length})
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600 mt-3">Loading requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Fuel className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {filterStatus === 'ALL' ? 'No fuel requests found' : `No ${statusLabels[filterStatus]} requests`}
            </p>
          </div>
        )}

        {/* Request List */}
        {!isLoading && filtered.length > 0 && (
          <>
            {/* Table for lg+ */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full text-sm text-gray-800">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-4 py-3">Ref #</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Liters</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((request) => (
                      <tr key={request.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-blue-700">
                            FR-{String(request.refNumber).padStart(6, '0')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[request.status]}>
                            {statusLabels[request.status] || request.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {request.dpwhNumber || '—'}
                        </td>
                        <td className="px-4 py-3">{request.supplierName || '—'}</td>
                        <td className="px-4 py-3">{request.validatedLiters || request.requestedLiters} L</td>
                        <td className="px-4 py-3">{request.destination}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {onView && (
                              <Button variant="outline" size="sm" onClick={() => onView(request)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            {onPrintRIS && canPrintRIS(request) && (
                              <Button variant="outline" size="sm" onClick={() => onPrintRIS(request)}>
                                <Printer className="h-4 w-4 mr-1" />
                                Print RIS
                              </Button>
                            )}
                            {onSubmitReceipt && canSubmitReceipt(request) && (
                              <Button variant="primary" size="sm" onClick={() => onSubmitReceipt(request)}>
                                <Upload className="h-4 w-4 mr-1" />
                                Submit Receipt
                              </Button>
                            )}
                            {onCancel && canCancel(request) && (
                              <Button variant="outline" size="sm" onClick={() => onCancel(request)}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards for small screens */}
            <div className="space-y-4 lg:hidden">
              {filtered.map((request) => (
                <Card key={request.id} className="border border-gray-200 hover:shadow-md transition">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Left: Request Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-blue-700">
                            FR-{String(request.refNumber).padStart(6, '0')}
                          </span>
                          <Badge className={statusColors[request.status]}>
                            {statusLabels[request.status] || request.status}
                          </Badge>
                          {request.risNumber && (
                            <span className="text-sm font-semibold text-purple-700">RIS: {request.risNumber}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>
                              {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Fuel className="h-4 w-4 text-gray-500" />
                          <span>{request.dpwhNumber || '—'}</span>
                        </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span>{request.supplierName || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Fuel className="h-4 w-4 text-gray-500" />
                            <span>
                              {request.validatedLiters || request.requestedLiters} L
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600">
                          <span className="font-semibold">Destination:</span> {request.destination}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap gap-2">
                        {onView && (
                          <Button variant="outline" size="sm" onClick={() => onView(request)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}

                        {onPrintRIS && canPrintRIS(request) && (
                          <Button variant="outline" size="sm" onClick={() => onPrintRIS(request)}>
                            <Printer className="h-4 w-4 mr-1" />
                            Print RIS
                          </Button>
                        )}

                        {onSubmitReceipt && canSubmitReceipt(request) && (
                          <Button variant="primary" size="sm" onClick={() => onSubmitReceipt(request)}>
                            <Upload className="h-4 w-4 mr-1" />
                            Submit Receipt
                          </Button>
                        )}

                        {onCancel && canCancel(request) && (
                          <Button variant="outline" size="sm" onClick={() => onCancel(request)}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FuelRequestList;
