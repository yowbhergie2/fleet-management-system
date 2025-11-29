import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { FuelRequisition, Contract } from '@/types';
import ContractSelector from './ContractSelector';

const schema = z.object({
  contractId: z.string().min(1, 'Contract is required'),
  validatedLiters: z
    .string()
    .min(1, 'Validated liters is required')
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid number'),
  validUntil: z.string().optional(),
  remarks: z.string().optional(),
});

type ValidationForm = z.infer<typeof schema>;

interface FuelValidationFormProps {
  requisition: FuelRequisition | null;
  contracts: Contract[];
  isSubmitting?: boolean;
  onBack?: () => void;
  onApprove: (payload: { contractId: string; validatedLiters: number; validUntil?: string | null; remarks?: string; loadedUpdatedAt?: Date | null }) => void;
  onReturn: (remarks: string, loadedUpdatedAt?: Date | null) => void;
  onReject: (remarks: string, loadedUpdatedAt?: Date | null) => void;
}

export function FuelValidationForm({
  requisition,
  contracts,
  isSubmitting,
  onBack,
  onApprove,
  onReturn,
  onReject,
}: FuelValidationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<ValidationForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      contractId: requisition?.contractId || '',
      validatedLiters: requisition?.validatedLiters?.toString() || requisition?.requestedLiters?.toString() || '',
      validUntil: requisition?.validUntil ? new Date(requisition.validUntil).toISOString().split('T')[0] : '',
      remarks: requisition?.emdRemarks || '',
    },
  });

  useEffect(() => {
    if (requisition) {
      setValue('validatedLiters', requisition.validatedLiters?.toString() || requisition.requestedLiters?.toString() || '');
      setValue('contractId', requisition.contractId || '');
      setValue('validUntil', requisition.validUntil ? new Date(requisition.validUntil).toISOString().split('T')[0] : '');
      setValue('remarks', requisition.emdRemarks || '');
    }
  }, [requisition, setValue]);

  // Auto-select contract by supplier when none chosen yet
  useEffect(() => {
    if (!requisition || !contracts.length) return;
    const current = watch('contractId');
    if (current) return;
    const firstMatch = contracts.find((c) => c.supplierId === requisition.supplierId && c.status !== 'EXHAUSTED');
    if (firstMatch) {
      setValue('contractId', firstMatch.id, { shouldValidate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts.length, requisition?.supplierId]);

  const selectedContractId = watch('contractId');
  const validUntilValue = watch('validUntil');
  const isEditMode = requisition?.status === 'EMD_VALIDATED';
  const loadedUpdatedAt = requisition?.updatedAt || null;
  const matchedContracts = useMemo(
    () => contracts.filter((c) => !requisition?.supplierId || c.supplierId === requisition?.supplierId),
    [contracts, requisition?.supplierId]
  );

  // Real-time validation: valid until must not be later than start date
  useEffect(() => {
    if (!validUntilValue) {
      clearErrors('validUntil');
      return;
    }
    if (!requisition?.inclusiveDateFrom) return;
    const validUntilDate = new Date(validUntilValue);
    const startDate = new Date(requisition.inclusiveDateFrom);
    if (!Number.isNaN(validUntilDate.getTime()) && !Number.isNaN(startDate.getTime()) && validUntilDate > startDate) {
      setError('validUntil', { type: 'manual', message: 'Valid until cannot be later than the start date.' });
    } else {
      clearErrors('validUntil');
    }
  }, [validUntilValue, requisition?.inclusiveDateFrom, clearErrors, setError]);

  const submitApprove = (data: ValidationForm) => {
    // Validation: validUntil should not be after the requisition start date
    if (data.validUntil && requisition?.inclusiveDateFrom) {
      const validUntilDate = new Date(data.validUntil);
      const startDate = new Date(requisition.inclusiveDateFrom);
      if (!Number.isNaN(validUntilDate.getTime()) && !Number.isNaN(startDate.getTime()) && validUntilDate > startDate) {
        setError('validUntil', { type: 'manual', message: 'Valid until cannot be later than the start date.' });
        return;
      }
    }

    onApprove({
      contractId: data.contractId,
      validatedLiters: parseFloat(data.validatedLiters),
      validUntil: data.validUntil || null,
      remarks: data.remarks?.trim() || undefined,
      loadedUpdatedAt,
    });
  };

  const handleReturn = () => {
    const remarks = window.prompt('Remarks for return?') || '';
    if (remarks.trim()) onReturn(remarks.trim(), loadedUpdatedAt);
  };

  const handleReject = () => {
    const remarks = window.prompt('Remarks for rejection?') || '';
    if (remarks.trim()) onReject(remarks.trim(), loadedUpdatedAt);
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-emerald-50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Badge variant="warning">EMD</Badge>
          Validate Request
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {isEditMode && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            You can adjust validation details while the request is already marked as EMD_VALIDATED.
          </div>
        )}
        {requisition && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Request</p>
              <p className="font-semibold text-gray-900">
                {requisition.requestedLiters} L • {requisition.fuelType}
              </p>
              <p className="text-xs text-gray-600 mt-1">Destination: {requisition.destination}</p>
              <p className="text-xs text-gray-600 mt-1">
                Dates: {requisition.inclusiveDateFrom ? new Date(requisition.inclusiveDateFrom).toLocaleDateString() : '—'} to{' '}
                {requisition.inclusiveDateTo ? new Date(requisition.inclusiveDateTo).toLocaleDateString() : '—'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Supplier: {requisition.supplierName || '—'}</p>
              <p className="text-xs text-gray-600 mt-1">Office: {requisition.officeName || '—'}</p>
              <p className="text-xs text-gray-600 mt-1">
                Purpose: {requisition.purpose?.split('\n').filter((p: string) => p.trim()).join('; ') || '—'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Passengers: {requisition.passengers || '—'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Driver & Vehicle</p>
              <p className="font-semibold text-gray-900">{requisition.driverName}</p>
              <p className="text-xs text-gray-600">{requisition.dpwhNumber} • {requisition.plateNumber}</p>
            </div>
          </div>
        )}

        <ContractSelector
          contracts={matchedContracts}
          selectedId={selectedContractId}
          onSelect={(id) => setValue('contractId', id, { shouldDirty: true, shouldTouch: true })}
          disabled={isSubmitting}
        />
        {errors.contractId && <p className="text-sm text-red-600">{errors.contractId.message}</p>}

        <form className="space-y-4" onSubmit={handleSubmit(submitApprove)}>
          <Input
            label="Validated liters"
            placeholder="e.g., 120"
            error={errors.validatedLiters?.message}
            required
            {...register('validatedLiters')}
          />
          <Input
            type="date"
            label="Valid until (optional)"
            error={errors.validUntil?.message}
            {...register('validUntil', {
              validate: (val) => {
                if (!val) return true;
                if (!requisition?.inclusiveDateFrom) return true;
                const validUntilDate = new Date(val);
                const startDate = new Date(requisition.inclusiveDateFrom);
                if (Number.isNaN(validUntilDate.getTime()) || Number.isNaN(startDate.getTime())) return true;
                return validUntilDate <= startDate || 'Valid until cannot be later than the start date.';
              },
            })}
          />
          <Textarea label="Remarks (optional)" {...register('remarks')} />

          <div className="flex flex-wrap gap-3 justify-end pt-2">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Back
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleReturn} disabled={isSubmitting}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Return
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isEditMode ? 'Update Validation' : 'Validate Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default FuelValidationForm;
