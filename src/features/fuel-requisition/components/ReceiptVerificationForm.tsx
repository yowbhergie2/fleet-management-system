import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { FuelRequisition } from '@/types';

const schema = z.object({
  actualLiters: z
    .string()
    .min(1, 'Actual liters is required')
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid number'),
  priceAtPurchase: z
    .string()
    .min(1, 'Price is required')
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid price'),
  remarks: z.string().optional(),
});

type VerifyForm = z.infer<typeof schema>;

interface ReceiptVerificationFormProps {
  requisition: FuelRequisition | null;
  isSubmitting?: boolean;
  onVerify: (payload: { actualLiters: number; priceAtPurchase: number; remarks?: string }) => void;
}

export function ReceiptVerificationForm({ requisition, isSubmitting, onVerify }: ReceiptVerificationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      actualLiters: requisition?.actualLiters?.toString() || '',
      priceAtPurchase: requisition?.priceAtPurchase?.toString() || '',
      remarks: '',
    },
  });

  const submit = (data: VerifyForm) => {
    onVerify({
      actualLiters: parseFloat(data.actualLiters),
      priceAtPurchase: parseFloat(data.priceAtPurchase),
      remarks: data.remarks?.trim() || undefined,
    });
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Badge variant="success">EMD</Badge>
          Verify Receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {requisition && (
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              RIS: <span className="font-semibold">{requisition.risNumber || '—'}</span>
            </p>
            <p>Supplier: {requisition.supplierName || '—'}</p>
            <p>Validated: {requisition.validatedLiters ?? requisition.requestedLiters} L</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <Input
            label="Actual liters received"
            placeholder="e.g., 115"
            error={errors.actualLiters?.message}
            required
            {...register('actualLiters')}
          />
          <Input
            label="Price at purchase (PHP/L)"
            placeholder="e.g., 57.60"
            error={errors.priceAtPurchase?.message}
            required
            {...register('priceAtPurchase')}
          />
          <Textarea label="Remarks (optional)" {...register('remarks')} />

          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-gray-600">
              Verify liters and price before completing. Contract deduction should run after verification.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify & Complete
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ReceiptVerificationForm;
