import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

const setupSchema = z.object({
  // Organization Info
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationFullName: z.string().min(2, 'Full name is required'),
  organizationAddress: z.string().min(5, 'Address is required'),

  // Admin User Info
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  adminConfirmPassword: z.string().min(6, 'Please confirm password'),
  adminDisplayName: z.string().min(2, 'Display name is required'),
  adminPosition: z.string().optional(),
  adminPhoneNumber: z.string().optional(),
}).refine((data) => data.adminPassword === data.adminConfirmPassword, {
  message: "Passwords don't match",
  path: ['adminConfirmPassword'],
});

type SetupFormData = z.infer<typeof setupSchema>;

interface SetupPageProps {
  onSetup: (data: SetupFormData) => Promise<void>;
}

export function SetupPage({ onSetup }: SetupPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'form' | 'success'>('form');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      organizationName: 'DTT-RIS',
      organizationFullName: 'Driver Trip Ticket - Requisition Information System',
      organizationAddress: 'Manila, Philippines',
    },
  });

  const onSubmit = async (data: SetupFormData) => {
    try {
      setError('');
      setIsSubmitting(true);
      await onSetup(data);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="pt-12 pb-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Setup Complete!</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Your DTT, RIS and Fuel Contract Management System is ready to use.
              </p>
              <Button
                className="w-full h-12 text-base font-semibold shadow-lg"
                onClick={() => window.location.href = '/login'}
              >
                Go to Login Page
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6">
            <Shield className="w-11 h-11 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">First-Time Setup</h1>
          <p className="text-lg text-gray-700 font-medium">Welcome to DTT, RIS and Fuel Contract Management System</p>
          <p className="text-sm text-gray-600 mt-2">
            Let's set up your organization and create the first admin account
          </p>
        </div>

        {/* Setup Form */}
        <Card className="shadow-xl border-0">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">System Configuration</CardTitle>
            <p className="text-sm text-gray-600 mt-2">Configure your organization and admin credentials</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 font-semibold">Setup Failed</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Organization Information */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-100">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Organization Information
                  </h3>
                </div>

                <Input
                  label="Organization Short Name"
                  placeholder="e.g., DTT-RIS"
                  error={errors.organizationName?.message}
                  required
                  {...register('organizationName')}
                />

                <Input
                  label="Organization Full Name"
                  placeholder="e.g., Driver Trip Ticket - Requisition Information System"
                  error={errors.organizationFullName?.message}
                  required
                  {...register('organizationFullName')}
                />

                <Input
                  label="Address"
                  placeholder="e.g., Manila, Philippines"
                  error={errors.organizationAddress?.message}
                  required
                  {...register('organizationAddress')}
                />
              </div>

              {/* Administrator Account */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-100">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Administrator Account
                  </h3>
                </div>

                <Input
                  label="Full Name"
                  placeholder="e.g., Juan Dela Cruz"
                  error={errors.adminDisplayName?.message}
                  required
                  {...register('adminDisplayName')}
                />

                <Input
                  type="email"
                  label="Email Address"
                  placeholder="e.g., admin@dtt-ris.gov.ph"
                  error={errors.adminEmail?.message}
                  helperText="This will be used to login"
                  required
                  {...register('adminEmail')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="password"
                    label="Password"
                    placeholder="Minimum 6 characters"
                    error={errors.adminPassword?.message}
                    required
                    {...register('adminPassword')}
                  />

                  <Input
                    type="password"
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    error={errors.adminConfirmPassword?.message}
                    required
                    {...register('adminConfirmPassword')}
                  />
                </div>

                <Input
                  label="Position/Designation"
                  placeholder="e.g., IT Administrator (optional)"
                  error={errors.adminPosition?.message}
                  {...register('adminPosition')}
                />

                <Input
                  label="Phone Number"
                  placeholder="e.g., +63 917 123 4567 (optional)"
                  error={errors.adminPhoneNumber?.message}
                  {...register('adminPhoneNumber')}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t-2 border-gray-100">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Setting up your system...' : 'Complete Setup'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <p className="text-xs text-gray-500 text-center mt-4">
                  By completing setup, you agree to secure and protect system access
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-medium">© 2025 DPWH Regional Office II</p>
          <p className="text-xs mt-1">DTT, RIS and Fuel Contract Management System v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
