import { useEffect } from 'react';
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
  onApprove: (payload: { contractId: string; validatedLiters: number; validUntil?: string | null; remarks?: string }) => void;
  onReturn: (remarks: string) => void;
  onReject: (remarks: string) => void;
}

export function FuelValidationForm({
  requisition,
  contracts,
  isSubmitting,
  onApprove,
  onReturn,
  onReject,
}: FuelValidationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ValidationForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractId: '',
      validatedLiters: requisition?.validatedLiters?.toString() || requisition?.requestedLiters?.toString() || '',
      validUntil: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (requisition) {
      setValue('validatedLiters', requisition.validatedLiters?.toString() || requisition.requestedLiters?.toString() || '');
    }
  }, [requisition, setValue]);

  const selectedContractId = watch('contractId');

  const submitApprove = (data: ValidationForm) => {
    onApprove({
      contractId: data.contractId,
      validatedLiters: parseFloat(data.validatedLiters),
      validUntil: data.validUntil || null,
      remarks: data.remarks?.trim() || undefined,
    });
  };

  const handleReturn = () => {
    const remarks = window.prompt('Remarks for return?') || '';
    if (remarks.trim()) onReturn(remarks.trim());
  };

  const handleReject = () => {
    const remarks = window.prompt('Remarks for rejection?') || '';
    if (remarks.trim()) onReject(remarks.trim());
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
        {requisition && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Request</p>
              <p className="font-semibold text-gray-900">
                {requisition.requestedLiters} L • {requisition.fuelType}
              </p>
              <p className="text-xs text-gray-600 mt-1">Destination: {requisition.destination}</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Driver & Vehicle</p>
              <p className="font-semibold text-gray-900">{requisition.driverName}</p>
              <p className="text-xs text-gray-600">{requisition.dpwhNumber} • {requisition.plateNumber}</p>
            </div>
          </div>
        )}

        <ContractSelector
          contracts={contracts}
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
          <Input type="date" label="Valid until (optional)" {...register('validUntil')} />
          <Textarea label="Remarks (optional)" {...register('remarks')} />

          <div className="flex flex-wrap gap-3 justify-end pt-2">
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
              Approve
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default FuelValidationForm;
