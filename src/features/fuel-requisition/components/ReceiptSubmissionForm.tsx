import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import imageCompression from 'browser-image-compression';
import { Upload, FileImage, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { FuelRequisition, ReceiptSubmissionPayload } from '@/types';

const receiptSchema = z.object({
  chargeInvoiceNumber: z.string().min(1, 'Charge Invoice Number is required'),
  chargeInvoiceDate: z.string().min(1, 'Invoice date is required'),
  refuelDate: z.string().optional(),
  actualLiters: z
    .string()
    .min(1, 'Actual liters is required')
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid number'),
  odometerAtRefuel: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      'Enter a valid odometer reading'
    ),
});

type ReceiptForm = z.infer<typeof receiptSchema>;

interface ReceiptSubmissionFormProps {
  mode?: 'submit' | 'edit';
  requisition: FuelRequisition | null;
  isSubmitting?: boolean;
  onSubmit: (payload: ReceiptSubmissionPayload) => void;
  onCancel?: () => void;
}

export function ReceiptSubmissionForm({ requisition, isSubmitting, onSubmit, onCancel, mode = 'submit' }: ReceiptSubmissionFormProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isReupload = useMemo(
    () =>
      requisition
        ? requisition.status === 'RECEIPT_SUBMITTED' || requisition.status === 'RECEIPT_RETURNED'
        : false,
    [requisition]
  );
  const loadedUpdatedAt = requisition?.updatedAt || null;
  const actionLabel = mode === 'edit' || isReupload ? 'Edit Receipt' : 'Submit Receipt';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiptForm>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      chargeInvoiceNumber: '',
      chargeInvoiceDate: '',
      refuelDate: '',
      actualLiters: requisition?.validatedLiters?.toString() || '',
      odometerAtRefuel: '',
    },
  });

  useEffect(() => {
    if (!requisition) return;
    reset({
      chargeInvoiceNumber: requisition.chargeInvoiceNumber || '',
      chargeInvoiceDate: requisition.chargeInvoiceDate
        ? new Date(requisition.chargeInvoiceDate).toISOString().split('T')[0]
        : '',
      refuelDate: requisition.refuelDate ? new Date(requisition.refuelDate).toISOString().split('T')[0] : '',
      actualLiters: requisition.actualLiters?.toString() || requisition.validatedLiters?.toString() || '',
      odometerAtRefuel: requisition.odometerAtRefuel?.toString() || '',
    });
    setReceiptPreview(requisition.receiptImageBase64 || null);
    setExistingReceipt(requisition.receiptImageBase64 || null);
    setUploadError(null);
  }, [requisition, reset]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptFile(null);
      setReceiptPreview(null);
      setUploadError(null);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload JPG, PNG, or WEBP image.');
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      // Compress image (max 1200px, quality 0.7, target < 750KB)
      const options = {
        maxSizeMB: 0.75, // 750KB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        initialQuality: 0.7,
        fileType: 'image/jpeg', // Convert to JPEG for better compression
      };

      const compressedFile = await imageCompression(file, options);

      // Validate compressed size < 750KB
      if (compressedFile.size > 750 * 1024) {
        setUploadError('Compressed image still too large. Please use a smaller image.');
        setReceiptFile(null);
        setReceiptPreview(null);
        setIsUploading(false);
        return;
      }

      setReceiptFile(compressedFile);

      // Create preview from compressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      // Show compression result
      const originalSizeKB = (file.size / 1024).toFixed(2);
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
      console.log(`Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB`);
    } catch (error) {
      console.error('Image compression failed:', error);
      setUploadError('Failed to process image. Please try another file.');
      setReceiptFile(null);
      setReceiptPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const convertFileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const submit = async (data: ReceiptForm) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      if (!requisition) {
        setUploadError('No requisition selected.');
        return;
      }

      let receiptBase64 = receiptPreview;

      if (receiptFile) {
        // Convert compressed image to Base64
        receiptBase64 = await convertFileToBase64(receiptFile);
      }

      if (!receiptBase64) {
        setUploadError('Please upload a receipt image.');
        return;
      }

      // Submit form with Base64 image
      onSubmit({
        chargeInvoiceNumber: data.chargeInvoiceNumber,
        chargeInvoiceDate: data.chargeInvoiceDate,
        refuelDate: data.refuelDate,
        actualLiters: parseFloat(data.actualLiters),
        odometerAtRefuel: data.odometerAtRefuel ? parseFloat(data.odometerAtRefuel) : undefined,
        receiptImageBase64,
        loadedUpdatedAt,
      });
    } catch (err) {
      console.error('Failed to process receipt:', err);
      setUploadError('Failed to process receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Badge variant="primary">Driver</Badge>
          {actionLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isReupload && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Receipt was already submitted. You can correct the invoice details or upload a clearer image before EMD verification.
          </div>
        )}
        {/* RIS Summary */}
        {requisition && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-1">
            <p className="text-blue-900">
              <span className="font-semibold">RIS Number:</span> {requisition.risNumber || '—'}
            </p>
            <p className="text-blue-900">
              <span className="font-semibold">Vehicle:</span> {requisition.dpwhNumber} ({requisition.plateNumber})
            </p>
            <p className="text-blue-900">
              <span className="font-semibold">Supplier:</span> {requisition.supplierName || '—'}
            </p>
            <p className="text-blue-900">
              <span className="font-semibold">Validated Liters:</span> {requisition.validatedLiters || requisition.requestedLiters} L
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Image <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="receipt-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </label>
              <input
                id="receipt-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              {receiptFile && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <FileImage className="h-4 w-4 text-green-600" />
                  {receiptFile.name}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Accepted: JPG, PNG, WEBP (Auto-compressed to max 750KB, 1200px)</p>
            {!receiptFile && existingReceipt && (
              <p className="text-xs text-gray-600 mt-1">
                Using existing receipt image. Upload a new file to replace it.
              </p>
            )}
            {uploadError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            {/* Image Preview */}
            {receiptPreview && (
              <div className="mt-3 border border-gray-300 rounded-lg overflow-hidden max-w-md">
                <img src={receiptPreview} alt="Receipt preview" className="w-full h-auto" />
              </div>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Charge Invoice Number"
              placeholder="e.g., INV-2025-001"
              error={errors.chargeInvoiceNumber?.message}
              required
              {...register('chargeInvoiceNumber')}
            />
            <Input
              label="Invoice Date"
              type="date"
              error={errors.chargeInvoiceDate?.message}
              required
              {...register('chargeInvoiceDate')}
            />
            <Input
              label="Refuel Date (optional)"
              type="date"
              error={errors.refuelDate?.message}
              {...register('refuelDate')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Actual Liters Received"
              type="number"
              step="0.01"
              placeholder="e.g., 50.5"
              error={errors.actualLiters?.message}
              required
              {...register('actualLiters')}
            />
            <Input
              label="Odometer Reading (Optional)"
              type="number"
              step="0.01"
              placeholder="e.g., 12500"
              error={errors.odometerAtRefuel?.message}
              {...register('odometerAtRefuel')}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              Please ensure all information is accurate. The EMD will verify the receipt and actual liters before
              completing the requisition.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isUploading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              isLoading={isSubmitting || isUploading}
              disabled={!receiptFile && !receiptPreview}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isUploading ? 'Processing...' : actionLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ReceiptSubmissionForm;
