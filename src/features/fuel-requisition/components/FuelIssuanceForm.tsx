import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { ClipboardList, History, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { Contract, FuelRequisition } from '@/types';

type FuelIssuanceFormValues = {
  contractId: string;
  risNumber: string;
  validUntil?: string;
  priceAtIssuance: string;
  remarks?: string;
};

interface FuelIssuanceFormProps {
  requisition: FuelRequisition | null;
  contracts: Contract[];
  isSubmitting?: boolean;
  onIssue: (payload: {
    contractId: string;
    risNumber: string;
    refNumber: number;
    validUntil: string | null;
    priceAtIssuance: number;
    remarks?: string;
  }) => Promise<void> | void;
}

const issuanceSchema = z.object({
  contractId: z.string().min(1, 'Contract is required'),
  risNumber: z.string().min(1, 'RIS number is required'),
  validUntil: z.string().optional(),
  priceAtIssuance: z
    .string()
    .min(1, 'Price is required')
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid price'),
  remarks: z.string().optional(),
});

const formatCurrency = (amount: number | null | undefined) =>
  typeof amount === 'number'
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
    : '—';

export function FuelIssuanceForm({ requisition, contracts, isSubmitting, onIssue }: FuelIssuanceFormProps) {
  const user = useUser();
  const [refNumber, setRefNumber] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FuelIssuanceFormValues>({
    resolver: zodResolver(issuanceSchema),
    defaultValues: {
      contractId: '',
      risNumber: '',
      priceAtIssuance: '',
      validUntil: '',
      remarks: '',
    },
  });

  const reqDetails = useMemo(() => requisition, [requisition]);

  const generateRISNumber = async () => {
    if (!user?.organizationId) return;
    setIsGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      const q = query(
        collection(db, 'fuel_requisitions'),
        where('organizationId', '==', user.organizationId),
        where('risNumber', '>=', prefix),
        where('risNumber', '<=', `${prefix}\uf8ff`),
        orderBy('risNumber', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      const lastRef = snap.empty ? 8224 : Number(snap.docs[0].data().refNumber || 8224);
      const nextRef = lastRef + 1;
      const risNumber = `${prefix}-${String(nextRef).padStart(4, '0')}`;
      setRefNumber(nextRef);
      setValue('risNumber', risNumber, { shouldDirty: true, shouldTouch: true });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    reset({
      contractId: reqDetails?.contractId || '',
      risNumber: '',
      priceAtIssuance: reqDetails?.priceAtIssuance?.toString() || '',
      validUntil: '',
      remarks: '',
    });
    // Auto-generate RIS number on load
    generateRISNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqDetails?.id]);

  const onSubmit = (data: FuelIssuanceFormValues) => {
    const price = parseFloat(data.priceAtIssuance);
    onIssue({
      contractId: data.contractId,
      risNumber: data.risNumber,
      refNumber,
      validUntil: data.validUntil || null,
      priceAtIssuance: price,
      remarks: data.remarks?.trim() || undefined,
    });
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-cyan-600" />
          Issue RIS
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {reqDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Vehicle</p>
              <p className="font-semibold text-gray-900">
                {reqDetails.dpwhNumber} • {reqDetails.plateNumber}
              </p>
              <p className="text-xs text-gray-600 mt-1">Driver: {reqDetails.driverName}</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Requested</p>
              <p className="font-semibold text-gray-900">
                {reqDetails.validatedLiters || reqDetails.requestedLiters} L • {reqDetails.fuelType}
              </p>
              <p className="text-xs text-gray-600 mt-1">Supplier: {reqDetails.supplierName || '—'}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="RIS Number"
              placeholder="YYYY-MM-XXXX"
              error={errors.risNumber?.message}
              required
              {...register('risNumber')}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={generateRISNumber}
                isLoading={isGenerating}
                className="w-full"
              >
                <History className="h-4 w-4 mr-2" />
                Regenerate RIS
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
              <select
                {...register('contractId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">Select contract</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} • {formatCurrency(c.remainingBalance)}
                  </option>
                ))}
              </select>
              {errors.contractId && <p className="text-sm text-red-600 mt-1">{errors.contractId.message}</p>}
            </div>
            <Input
              type="number"
              step="0.01"
              label="Price at issuance (PHP/L)"
              placeholder="e.g., 57.60"
              error={errors.priceAtIssuance?.message}
              required
              {...register('priceAtIssuance')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input type="date" label="Valid until (optional)" {...register('validUntil')} />
            <Input label="Remarks (optional)" placeholder="Notes" {...register('remarks')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Issuing...
                </>
              ) : (
                'Issue RIS'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default FuelIssuanceForm;
