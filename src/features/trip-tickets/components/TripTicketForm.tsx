import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Button, Input, Select, Textarea, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { formatDateForInput, getCurrentPHTime } from '@/lib/utils';
import type { TripTicketFormData, Passenger } from '@/types';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Validation schema
const tripTicketSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  divisionOffice: z.string().min(1, 'Division/Office is required'),
  destination: z.string().min(1, 'Destination is required'),
  purposes: z.string().min(1, 'Purpose is required'),
  periodCoveredFrom: z.string().min(1, 'Start date is required'),
  periodCoveredTo: z.string().min(1, 'End date is required'),
  approvingAuthorityId: z.string().min(1, 'Approving authority is required'),
  authorityPrefix: z.string().optional(),
  recommendingOfficerId: z.string().min(1, 'Recommending officer is required'),
}).refine((data) => {
  const fromDate = new Date(data.periodCoveredFrom);
  const toDate = new Date(data.periodCoveredTo);
  return toDate >= fromDate;
}, {
  message: 'End date must be after or equal to start date',
  path: ['periodCoveredTo'],
});

type FormValues = z.infer<typeof tripTicketSchema>;

interface TripTicketFormProps {
  onSubmit: (data: TripTicketFormData & { status?: 'pending_approval'; referenceId?: string }) => void;
  onGeneratePDF?: (data: TripTicketFormData) => void;
  isLoading?: boolean;
  initialData?: TripTicketFormData;
  isEditMode?: boolean;
  onCancel?: () => void;
}

export function TripTicketForm({ onSubmit, onGeneratePDF, isLoading = false, initialData, isEditMode = false, onCancel }: TripTicketFormProps) {
  const user = useUser();
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: '' }]);
  const [passengerError, setPassengerError] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [officeSignatoryMap, setOfficeSignatoryMap] = useState<Record<string, string>>({});
  const [recommendingOfficerName, setRecommendingOfficerName] = useState<string>('');
  const [signatoryDetails, setSignatoryDetails] = useState<Record<string, { name: string; position: string }>>({});
  const [divisionOptions, setDivisionOptions] = useState<{ value: string; label: string }[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<{ value: string; label: string }[]>([]);
  const [signatoryOptions, setSignatoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [approverOptions, setApproverOptions] = useState<{ value: string; label: string; prefix?: string; officerId?: string; position?: string }[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [purposeSuggestions, setPurposeSuggestions] = useState<string[]>([]);
  const [passengerSuggestions, setPassengerSuggestions] = useState<string[]>([]);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [showPurposeDropdown, setShowPurposeDropdown] = useState(false);
  const [activePassengerDropdown, setActivePassengerDropdown] = useState<number | null>(null);
  const driverDisplayName = (isEditMode && (initialData as any)?.driverName) || user?.displayName || '';

  const today = formatDateForInput(getCurrentPHTime());

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    getValues,
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(tripTicketSchema),
    mode: 'onChange',
    criteriaMode: 'all',
    reValidateMode: 'onChange',
    defaultValues: {
      periodCoveredFrom: today,
      periodCoveredTo: today,
      authorityPrefix: '',
      vehicleId: '',
      divisionOffice: '',
      approvingAuthorityId: '',
      recommendingOfficerId: '',
      destination: '',
      purposes: '',
    },
  });

  const selectedDivision = watch('divisionOffice');
  const selectedRecommenderId = watch('recommendingOfficerId');
  const destinationValue = watch('destination');
  const purposesValue = watch('purposes');
  const filteredDestinationSuggestions = useMemo(() => {
    const query = (destinationValue || '').toUpperCase();
    const list = destinationSuggestions || [];
    const filtered = query ? list.filter((s) => s.includes(query)) : list;
    return filtered.slice(0, 8);
  }, [destinationSuggestions, destinationValue]);

  const filteredPurposeSuggestions = useMemo(() => {
    const lastLine = (purposesValue || '').toUpperCase().split('\n').pop() || '';
    const list = purposeSuggestions || [];
    const filtered = lastLine ? list.filter((s) => s.includes(lastLine)) : list;
    return filtered.slice(0, 8);
  }, [purposeSuggestions, purposesValue]);

  const filteredPassengerSuggestions = useMemo(
    () => (current: string) => {
      const query = (current || '').toUpperCase();
      const list = passengerSuggestions || [];
      const filtered = query ? list.filter((s) => s.includes(query)) : list;
      return filtered.slice(0, 8);
    },
    [passengerSuggestions]
  );

  const STORAGE_KEYS = {
    destination: 'trip_dest_suggestions',
    purposes: 'trip_purpose_suggestions',
    passenger: 'trip_passenger_suggestions',
  };

  const resetForm = () => {
    reset({
      periodCoveredFrom: today,
      periodCoveredTo: today,
      authorityPrefix: '',
      vehicleId: '',
      divisionOffice: '',
      approvingAuthorityId: '',
      recommendingOfficerId: '',
      destination: '',
      purposes: '',
    });
    setPassengers([{ name: '' }]);
    setPassengerError('');
    setActionMessage(null);
    setRecommendingOfficerName('');
    setVehicleFilter('');
    setShowDestinationDropdown(false);
    setShowPurposeDropdown(false);
    setActivePassengerDropdown(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadLocalSuggestions = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistSuggestions = (key: string, values: string[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(values.slice(0, 15)));
    } catch {
      // ignore storage errors
    }
  };

  const addSuggestion = (key: keyof typeof STORAGE_KEYS, value: string) => {
    const clean = value.trim().toUpperCase();
    if (clean.length < 2) return;
    const current =
      key === 'destination'
        ? destinationSuggestions
        : key === 'purposes'
          ? purposeSuggestions
          : passengerSuggestions;
    const next = [clean, ...current.filter((v) => v !== clean)].slice(0, 15);
    if (key === 'destination') setDestinationSuggestions(next);
    if (key === 'purposes') setPurposeSuggestions(next);
    if (key === 'passenger') setPassengerSuggestions(next);
    persistSuggestions(STORAGE_KEYS[key], next);
  };

  useEffect(() => {
    setDestinationSuggestions(loadLocalSuggestions(STORAGE_KEYS.destination));
    setPurposeSuggestions(loadLocalSuggestions(STORAGE_KEYS.purposes));
    setPassengerSuggestions(loadLocalSuggestions(STORAGE_KEYS.passenger));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && isEditMode && !lookupLoading) {
      // Cast to any to access fields that might exist in the database but not in TripTicketFormData
      const data = initialData as any;

      console.log('Populating form with initial data:', data);

      // Use reset to set all values at once with proper form state update
      reset({
        vehicleId: data.vehicleId || '',
        divisionOffice: data.divisionOffice || '',
        destination: data.destination || '',
        purposes: Array.isArray(data.purposes) ? data.purposes.join('\n') : (typeof data.purposes === 'string' ? data.purposes : ''),
        periodCoveredFrom: data.periodCoveredFrom ? formatDateForInput(new Date(data.periodCoveredFrom as any)) : today,
        periodCoveredTo: data.periodCoveredTo ? formatDateForInput(new Date(data.periodCoveredTo as any)) : today,
        authorityPrefix: data.authorityPrefix || '',
        approvingAuthorityId: data.approvingAuthorityId || '',
        recommendingOfficerId: data.recommendingOfficerId || '',
      });

      // Set passengers separately as they're not part of the form
      if (data.authorizedPassengers && data.authorizedPassengers.length > 0) {
        setPassengers(data.authorizedPassengers);
      }
    }
  }, [initialData, isEditMode, lookupLoading, reset, today]);

  useEffect(() => {
    const loadOptions = async () => {
      if (!user?.organizationId) return;
      setLookupLoading(true);
      try {
        const officesSnap = await getDocs(
          query(collection(db, 'offices'), where('organizationId', '==', user.organizationId))
        );
        const divisions = officesSnap.docs.map((doc) => ({
          value: doc.id,
          label: ((doc.data().name as string) || 'Office').toUpperCase(),
        }));
        // Sort divisions alphabetically by label
        divisions.sort((a, b) => a.label.localeCompare(b.label));
        setDivisionOptions(divisions);
        const officeMap: Record<string, string> = {};
        officesSnap.docs.forEach((d) => {
          const data = d.data() as any;
          if (data.signatoryId) {
            officeMap[d.id] = data.signatoryId as string;
          }
        });
        setOfficeSignatoryMap(officeMap);
        // Pre-select division based on driver's profile (match by name, uppercase)
        if (!selectedDivision && user?.divisionOffice) {
          const match = divisions.find(
            (d) => d.label === (user.divisionOffice as string).toUpperCase()
          );
          if (match) {
            setValue('divisionOffice', match.value, { shouldValidate: true });
            const mappedId = officeMap[match.value];
            if (mappedId) {
              setValue('recommendingOfficerId', mappedId, { shouldValidate: true });
              const name = signatoryOptions.find((s) => s.value === mappedId)?.label || '';
              setRecommendingOfficerName(name);
            }
          }
        }

        const vehiclesSnap = await getDocs(
          query(collection(db, 'vehicles'), where('organizationId', '==', user.organizationId))
        );
        const vehicles = vehiclesSnap.docs.map((doc) => {
          const data = doc.data() as any;
          const label = `${data.dpwhNumber || ''} ${data.brand || ''} ${data.model || ''} - ${data.plateNumber || ''}`
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
          return { value: doc.id, label: label || 'VEHICLE' };
        });
        setVehicleOptions(vehicles);

        const signatoriesSnap = await getDocs(
          query(collection(db, 'signatories'), where('organizationId', '==', user.organizationId))
        );
        const signatoryMap: Record<string, { name: string; position: string }> = {};
        const signatories = signatoriesSnap.docs.map((doc) => {
          const data = doc.data() as any;
          const name = ((data.name as string) || 'Signatory').toUpperCase();
          const position = (data.position || '').toString();
          signatoryMap[doc.id] = { name, position };
          return {
            value: doc.id,
            label: name,
          };
        });
        setSignatoryDetails(signatoryMap);
        setSignatoryOptions(signatories);

        const approversSnap = await getDocs(
          query(collection(db, 'approving_authorities'), where('organizationId', '==', user.organizationId))
        );
        const approvers = approversSnap.docs.map((doc) => {
          const data = doc.data() as any;
          const officerDetails = signatoryMap[data.officerId] || { name: 'APPROVER', position: '' };
          const officerLabel = officerDetails.name || 'APPROVER';
          return {
            value: doc.id,
            label: `${officerLabel}`.toUpperCase(),
            prefix: data.prefix || '',
            officerId: data.officerId,
            position: officerDetails.position,
          };
        });
        setApproverOptions(approvers);

        if (approvers.length > 0) {
          const first = approvers[0];
          const currentApprover = getValues('approvingAuthorityId');
          if (!currentApprover) {
            setValue('approvingAuthorityId', first.value, { shouldValidate: true });
            setValue('authorityPrefix', first.prefix || '', { shouldValidate: false });
          }
        }
      } catch (err) {
        console.error('Failed to load lookups', err);
      } finally {
        setLookupLoading(false);
      }
    };
    loadOptions();
  }, [user?.organizationId, reset]);

  const applyRecommenderFromDivision = useMemo(
    () => (divisionId: string) => {
      const mappedId = officeSignatoryMap[divisionId] || '';
      const name = signatoryOptions.find((s) => s.value === mappedId)?.label || '';
      setValue('recommendingOfficerId', mappedId, { shouldValidate: true });
      setRecommendingOfficerName(name);
    },
    [officeSignatoryMap, setValue, signatoryOptions]
  );

  useEffect(() => {
    if (selectedDivision) {
      applyRecommenderFromDivision(selectedDivision);
    } else {
      setRecommendingOfficerName('');
      setValue('recommendingOfficerId', '', { shouldValidate: true });
    }
  }, [applyRecommenderFromDivision, selectedDivision, setValue]);

  useEffect(() => {
    if (selectedRecommenderId) {
      const name = signatoryOptions.find((s) => s.value === selectedRecommenderId)?.label || '';
      setRecommendingOfficerName(name);
    }
  }, [selectedRecommenderId, signatoryOptions]);

  const addPassenger = () => setPassengers([...passengers, { name: '' }]);
  const removePassenger = (index: number) => {
    if (passengers.length > 1) setPassengers(passengers.filter((_, i) => i !== index));
  };
  const updatePassenger = (index: number, value: string) => {
    const updated = [...passengers];
    updated[index] = { name: value };
    setPassengers(updated);
  };

  const buildSubmission = (data: FormValues, status: 'pending_approval', allowIncomplete = false) => {
    const validPassengers = allowIncomplete
      ? passengers.filter((p) => p.name.trim() !== '')
      : passengers.filter((p) => p.name.trim() !== '');

    if (!allowIncomplete && validPassengers.length === 0) {
      throw new Error('Please add at least one passenger');
    }

    const purposesList = data.purposes
      ? data.purposes.split('\n').filter((p: string) => p.trim() !== '')
      : [];

    const approvingOption = approverOptions.find((a) => a.value === data.approvingAuthorityId);
    const approvingSignatory = approvingOption?.officerId ? signatoryDetails[approvingOption.officerId] : undefined;
    const approvingPosition = approvingSignatory?.position || '';
    const approvingNameFromSignatory = approvingSignatory?.name || '';
    const approvingName =
      approvingNameFromSignatory ||
      approverOptions.find((a) => a.value === data.approvingAuthorityId)?.label ||
      '';
    const recommendingName =
      recommendingOfficerName || signatoryOptions.find((s) => s.value === data.recommendingOfficerId)?.label || '';
    const recommendingPosition = signatoryDetails[data.recommendingOfficerId || '']?.position || '';

    const formData: TripTicketFormData & {
      status: 'pending_approval';
      approvingAuthorityId?: string;
      recommendingOfficerId?: string;
    } = {
      ...data,
      purposes: purposesList,
      authorizedPassengers: validPassengers,
      status,
      approvingAuthorityId: data.approvingAuthorityId,
      recommendingOfficerId: data.recommendingOfficerId,
      approvingAuthorityName: approvingName,
      approvingAuthorityPosition: approvingPosition,
      recommendingOfficerName: recommendingName,
      recommendingOfficerPosition: recommendingPosition,
    };

    return formData;
  };

  const onFormSubmit = async (data: FormValues) => {
    setActionMessage(null);
    setIsSubmittingFinal(true);
    try {
      const formData = buildSubmission(data, 'pending_approval', false);
      await Promise.resolve(onSubmit(formData));
      const purposesList = data.purposes
        ? data.purposes.split('\n').filter((p: string) => p.trim() !== '')
        : [];
      setActionMessage({ type: 'success', text: 'Submitted for approval.' });
      addSuggestion('destination', data.destination);
      purposesList.forEach((p) => addSuggestion('purposes', p));
      passengers.forEach((p) => addSuggestion('passenger', p.name));
      setPassengerError('');
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit.';
      setActionMessage({ type: 'error', text: message });
      if (message.toLowerCase().includes('passenger')) {
        setPassengerError(message);
      }
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      resetForm();
    }
  };

  const handleGeneratePDF = () => {
    const data = getValues();
    if (!isValid) {
      alert('Please fill in all required fields before generating PDF');
      return;
    }
    const validPassengers = passengers.filter((p: Passenger) => p.name.trim() !== '');
    if (validPassengers.length === 0) {
      setPassengerError('Please add at least one passenger');
      return;
    }
    setPassengerError('');
    const formData: TripTicketFormData = {
      ...data,
      purposes: data.purposes.split('\n').filter((p: string) => p.trim() !== ''),
      authorizedPassengers: validPassengers,
      approvingAuthorityId: data.approvingAuthorityId,
      recommendingOfficerId: data.recommendingOfficerId,
      approvingAuthorityName:
        signatoryDetails[approverOptions.find((a) => a.value === data.approvingAuthorityId)?.officerId || '']?.name ||
        approverOptions.find((a) => a.value === data.approvingAuthorityId)?.label ||
        '',
      approvingAuthorityPosition:
        signatoryDetails[approverOptions.find((a) => a.value === data.approvingAuthorityId)?.officerId || '']?.position || '',
      recommendingOfficerName:
        signatoryDetails[data.recommendingOfficerId || '']?.name ||
        recommendingOfficerName ||
        signatoryOptions.find((s) => s.value === data.recommendingOfficerId)?.label ||
        '',
      recommendingOfficerPosition: signatoryDetails[data.recommendingOfficerId || '']?.position || '',
    };
    onGeneratePDF?.(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white">
          <CardTitle className="flex items-center gap-3 text-2xl text-white">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <FileText className="h-6 w-6 text-white" />
            </div>
            Driver's Trip Ticket
          </CardTitle>
          <p className="text-blue-100 mt-2">Capture trip details, passengers, and approvals in one flow.</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {lookupLoading && isEditMode && (
            <div className="rounded-lg px-4 py-3 text-sm bg-blue-50 text-blue-800 border border-blue-200">
              Loading form data...
            </div>
          )}
          {actionMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {actionMessage.text}
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Input
                label="Driver"
                placeholder="Driver name"
                value={driverDisplayName.toUpperCase()}
                readOnly
                disabled
                toUppercase
              />
              <Controller
                name="divisionOffice"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Division/Office"
                    options={divisionOptions}
                    placeholder={lookupLoading ? 'Loading offices...' : 'Select division...'}
                    error={errors.divisionOffice?.message}
                    required
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      applyRecommenderFromDivision(val);
                    }}
                    disabled={lookupLoading || isLoading}
                    className="uppercase"
                  />
                )}
              />
              <div className="space-y-2">
                <Input
                  label="Search vehicle"
                  placeholder="Filter by DPWH No., plate, or model"
                  value={vehicleFilter}
                  disabled={lookupLoading || isLoading}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  toUppercase
                />
                <Controller
                  name="vehicleId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Vehicle"
                      options={vehicleOptions.filter((opt) =>
                        opt.label.toLowerCase().includes(vehicleFilter.toLowerCase())
                      )}
                      placeholder={lookupLoading ? 'Loading vehicles...' : 'Select vehicle...'}
                      error={errors.vehicleId?.message}
                      required
                      value={field.value}
                      onChange={field.onChange}
                      disabled={lookupLoading || isLoading}
                      className="uppercase"
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Controller
                name="periodCoveredFrom"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    label="Period Covered From"
                    error={errors.periodCoveredFrom?.message}
                    required
                    autoComplete="on"
                    disabled={lookupLoading || isLoading}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="periodCoveredTo"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    label="Period Covered To"
                    error={errors.periodCoveredTo?.message}
                    required
                    autoComplete="on"
                    disabled={lookupLoading || isLoading}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  Authorized Passengers
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Add all passengers for this trip</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPassenger} className="shadow-sm" disabled={lookupLoading || isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Passenger
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {passengerError && (
              <div className="text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-lg p-3">
                {passengerError}
              </div>
            )}
            {passengers.map((passenger, index) => (
              <div key={`passenger-${index}`} className="flex gap-3 items-start flex-col sm:flex-row">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Passenger name"
                    toUppercase
                    autoComplete="name"
                    value={passenger.name}
                    disabled={lookupLoading || isLoading}
                    onChange={(e) => updatePassenger(index, e.target.value)}
                    onFocus={() => setActivePassengerDropdown(index)}
                    onBlur={() => setTimeout(() => setActivePassengerDropdown(null), 120)}
                  />
                  {activePassengerDropdown === index && filteredPassengerSuggestions(passenger.name).length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto text-sm text-gray-800 mt-2">
                      {filteredPassengerSuggestions(passenger.name).map((suggestion) => (
                        <button
                          key={`${suggestion}-${index}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-primary-50"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updatePassenger(index, suggestion);
                            setActivePassengerDropdown(null);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePassenger(index)}
                  disabled={lookupLoading || isLoading || passengers.length === 1}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-xl">Trip Details</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Specify destination and purpose</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="relative">
              <Controller
                name="destination"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Destination"
                    placeholder="e.g., City Hall, Quezon City"
                    error={errors.destination?.message}
                    required
                    autoComplete="on"
                    disabled={lookupLoading || isLoading}
                    toUppercase
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                    onFocus={() => setShowDestinationDropdown(true)}
                    onBlur={(e) => {
                      field.onBlur();
                      setTimeout(() => setShowDestinationDropdown(false), 120);
                    }}
                  />
                )}
              />
              {showDestinationDropdown && filteredDestinationSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-56 overflow-auto">
                  {filteredDestinationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-primary-50 text-sm font-semibold text-gray-800"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setValue('destination', suggestion, { shouldValidate: true });
                        setShowDestinationDropdown(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              label="Purpose(s)"
              placeholder="Enter each purpose on a new line\ne.g., Attend meeting\nSubmit documents"
              rows={4}
              error={errors.purposes?.message}
              helperText="Enter each purpose on a separate line"
              required
              autoComplete="on"
              disabled={lookupLoading || isLoading}
              {...register('purposes')}
              toUppercase
              onFocus={() => setShowPurposeDropdown(true)}
              onBlur={() => setTimeout(() => setShowPurposeDropdown(false), 120)}
            />
            {showPurposeDropdown && filteredPurposeSuggestions.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-56 overflow-auto text-sm text-gray-800">
                {filteredPurposeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-primary-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const current = purposesValue || '';
                      const lines = current.split('\n').filter((l) => l.trim() !== '');
                      lines.push(suggestion);
                      const next = lines.join('\n');
                      setValue('purposes', next, { shouldValidate: true });
                      setShowPurposeDropdown(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <CardTitle className="text-xl">Approval Information</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Recommending officer and approving authority</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start [&>*]:min-w-0">
            <div className="space-y-2">
              <input type="hidden" {...register('recommendingOfficerId', { required: true })} />
              <Input
                label="Recommending Officer (Auto-selected)"
                placeholder="Auto-selected from division signatory"
                value={recommendingOfficerName}
                readOnly
                disabled
                toUppercase
                error={errors.recommendingOfficerId?.message}
              />
              {!recommendingOfficerName && (
                <p className="text-xs text-amber-600">
                  No signatory linked to the selected division.
                </p>
              )}
            </div>
            <Controller
              name="approvingAuthorityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Approving Authority"
                  options={approverOptions.map((a) => ({ value: a.value, label: a.label }))}
                  placeholder={lookupLoading ? 'Loading authorities...' : 'Select approving authority'}
                  error={errors.approvingAuthorityId?.message}
                  required
                  value={field.value}
                  onChange={(val) => {
                    const selected = approverOptions.find((a) => a.value === val);
                    field.onChange(val);
                    if (selected) {
                      reset((prev) => ({ ...prev, authorityPrefix: selected.prefix || prev.authorityPrefix }));
                    }
                  }}
                  disabled={lookupLoading || isLoading}
                  className="uppercase"
                />
              )}
            />
            <Controller
              name="authorityPrefix"
              control={control}
              render={({ field }) => (
                <Select
                  label="Prefix of Approving Authority"
                  options={[
                    { value: '', label: 'NONE' },
                    { value: 'By Authority of the Regional Director:', label: 'BY AUTHORITY OF THE REGIONAL DIRECTOR:' },
                    { value: 'By Authority of the OIC-Regional Director:', label: 'BY AUTHORITY OF THE OIC-REGIONAL DIRECTOR:' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={lookupLoading || isLoading}
                  className="uppercase"
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={lookupLoading || isLoading || isSubmittingFinal}
          className="h-12 text-base font-semibold"
        >
          Cancel
        </Button>
        {onGeneratePDF && user?.role !== 'driver' && (
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={lookupLoading || isLoading || !isValid}
            className="h-12 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
          >
            <FileText className="h-5 w-5 mr-2" />
            Preview PDF
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmittingFinal || isLoading}
          disabled={lookupLoading || isLoading || !isValid}
          className="h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          {isSubmittingFinal ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Trip Ticket' : 'Submit for Approval')}
        </Button>
      </div>
    </form>
  );
}

