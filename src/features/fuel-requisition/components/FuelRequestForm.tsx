import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FileText, Fuel, X } from 'lucide-react';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { Office, ApprovingAuthority, Supplier, FuelRequisition, FuelRequestSubmitPayload } from '@/types';

const requestSchema = z
  .object({
    officeId: z.string().min(1, 'Office is required'),
    vehicleId: z.string().min(1, 'Vehicle is required'),
    supplierId: z.string().min(1, 'Supplier is required'),
    passengers: z.string().min(1, 'Passengers are required'),
    inclusiveDateFrom: z.string().min(1, 'Start date is required'),
    inclusiveDateTo: z.string().min(1, 'End date is required'),
    destination: z.string().min(1, 'Destination is required'),
    purpose: z.array(z.string().min(1)).min(1, 'At least one purpose is required'),
    requestedLiters: z
      .string()
      .min(1, 'Requested liters is required')
      .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid number'),
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.inclusiveDateFrom);
    const to = new Date(data.inclusiveDateTo);

    if (Number.isNaN(from.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inclusiveDateFrom'],
        message: 'Invalid start date',
      });
    }

    if (Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inclusiveDateTo'],
        message: 'Invalid end date',
      });
    }

    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inclusiveDateTo'],
        message: 'End date cannot be before start date',
      });
    }
  });

type RequestForm = z.infer<typeof requestSchema>;

interface Vehicle {
  id: string;
  dpwhNumber: string;
  brand: string;
  model: string;
  plateNumber: string;
  fuelType?: string;
  status?: string;
}

interface FuelRequestFormProps {
  mode?: 'create' | 'edit';
  requisition?: FuelRequisition | null;
  isSubmitting?: boolean;
  onSubmit: (data: FuelRequestSubmitPayload) => void;
  onCancel?: () => void;
}

export function FuelRequestForm({ mode = 'create', requisition, isSubmitting, onSubmit, onCancel }: FuelRequestFormProps) {
  const user = useUser();
  const [offices, setOffices] = useState<Office[]>([]);
  const [signatories, setSignatories] = useState<Record<string, { name: string; position: string }>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [authorities, setAuthorities] = useState<ApprovingAuthority[]>([]);
  const [lastIssuance, setLastIssuance] = useState<FuelRequisition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passengerInput, setPassengerInput] = useState('');
  const [passengerList, setPassengerList] = useState<string[]>([]);
  const [purposeInput, setPurposeInput] = useState('');
  const [previousDestinations, setPreviousDestinations] = useState<string[]>([]);
  const [previousPurposes, setPreviousPurposes] = useState<string[]>([]);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [showPurposeSuggestions, setShowPurposeSuggestions] = useState(false);
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<Date | null>(null);
  const lastPopulatedIdRef = useRef<string | null>(null);

  // Helper function to convert Date to input format - defined before useForm
  const toDateInput = useCallback((value: Date | string | null | undefined) => {
    if (!value) return '';
    const dateValue = value instanceof Date ? value : new Date(value);
    return Number.isNaN(dateValue.getTime()) ? '' : dateValue.toISOString().split('T')[0];
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    mode: 'onChange',
    defaultValues: {
      officeId: '',
      vehicleId: '',
      supplierId: '',
      passengers: '',
      inclusiveDateFrom: '',
      inclusiveDateTo: '',
      destination: '',
      purpose: [],
      requestedLiters: '',
    },
    values: mode === 'edit' && requisition ? {
      officeId: requisition.officeId || '',
      vehicleId: requisition.vehicleId || '',
      supplierId: requisition.supplierId || '',
      passengers: requisition.passengers || '',
      inclusiveDateFrom: toDateInput(requisition.inclusiveDateFrom),
      inclusiveDateTo: toDateInput(requisition.inclusiveDateTo),
      destination: requisition.destination || '',
      purpose: requisition.purpose ? requisition.purpose.split('\n').filter(Boolean) : [],
      requestedLiters: requisition.requestedLiters?.toString() || '',
    } : undefined,
  });

  useEffect(() => {
    register('purpose');
  }, [register]);

  const selectedOfficeId = watch('officeId');
  const selectedVehicleId = watch('vehicleId');

  // Populate defaults when editing or resetting to create mode
  useEffect(() => {
    if (mode === 'edit' && requisition) {
      // Prevent duplicate population for the same requisition
      if (lastPopulatedIdRef.current === requisition.id) {
        return;
      }

      lastPopulatedIdRef.current = requisition.id;

      const purposeLines = requisition.purpose ? requisition.purpose.split('\n').filter(Boolean) : [];
      const passengerArray =
        requisition.passengers?.split(',').map((p) => p.trim()).filter(Boolean) || [];

      // Populate form values immediately
      const formData = {
        officeId: requisition.officeId || '',
        vehicleId: requisition.vehicleId || '',
        supplierId: requisition.supplierId || '',
        passengers: requisition.passengers || '',
        inclusiveDateFrom: toDateInput(requisition.inclusiveDateFrom),
        inclusiveDateTo: toDateInput(requisition.inclusiveDateTo),
        destination: requisition.destination || '',
        purpose: purposeLines,
        requestedLiters: requisition.requestedLiters?.toString() || '',
      };

      console.log('🔍 Populating form for requisition:', requisition.id);
      console.log('📝 Form data being set:', formData);

      reset(formData);

      setPassengerList(passengerArray);
      setPurposeInput('');
      setValue('purpose', purposeLines, { shouldValidate: true });
      setLoadedUpdatedAt(requisition.updatedAt || null);

      // Double-check after reset
      setTimeout(() => {
        console.log('✅ Form state after reset - requestedLiters:', watch('requestedLiters'));
        console.log('✅ Form state after reset - inclusiveDateFrom:', watch('inclusiveDateFrom'));
        console.log('✅ Form state after reset - inclusiveDateTo:', watch('inclusiveDateTo'));
      }, 100);

      return;
    }

    if (mode === 'create') {
      lastPopulatedIdRef.current = null;
      reset({
        officeId: '',
        vehicleId: '',
        supplierId: '',
        passengers: '',
        inclusiveDateFrom: '',
        inclusiveDateTo: '',
        destination: '',
        purpose: [],
        requestedLiters: '',
      });
      setPassengerList([]);
      setPurposeInput('');
      setLoadedUpdatedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, requisition?.id]);

  // Re-apply dropdown values after data loads (fixes dropdown population issue)
  useEffect(() => {
    if (mode === 'edit' && requisition && offices.length > 0 && vehicles.length > 0 && suppliers.length > 0) {
      // Ensure dropdown values are set after options are loaded
      setValue('officeId', requisition.officeId, { shouldValidate: false });
      setValue('vehicleId', requisition.vehicleId, { shouldValidate: false });
      setValue('supplierId', requisition.supplierId || '', { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, requisition?.id, offices.length, vehicles.length, suppliers.length]);

  // Load offices
  useEffect(() => {
    const loadOffices = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(collection(db, 'offices'), where('organizationId', '==', user.organizationId));
        const snap = await getDocs(q);
        setOffices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Office)));
      } catch (err) {
        console.error('Failed to load offices:', err);
      }
    };
    loadOffices();
  }, [user?.organizationId]);

  // Load signatories
  useEffect(() => {
    const loadSignatories = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(collection(db, 'signatories'), where('organizationId', '==', user.organizationId));
        const snap = await getDocs(q);
        const map: Record<string, { name: string; position: string }> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[d.id] = { name: data.name || '', position: data.position || '' };
        });
        setSignatories(map);
      } catch (err) {
        console.error('Failed to load signatories:', err);
      }
    };
    loadSignatories();
  }, [user?.organizationId]);

  // Load vehicles
  useEffect(() => {
    const loadVehicles = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(
          collection(db, 'vehicles'),
          where('organizationId', '==', user.organizationId),
          where('status', '==', 'Active')
        );
        const snap = await getDocs(q);
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      }
    };
    loadVehicles();
  }, [user?.organizationId]);

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(
          collection(db, 'suppliers'),
          where('organizationId', '==', user.organizationId),
          where('status', '==', 'ACTIVE')
        );
        const snap = await getDocs(q);
        setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)));
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      }
    };
    loadSuppliers();
  }, [user?.organizationId]);

  // Load approving authorities
  useEffect(() => {
    const loadAuthorities = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(collection(db, 'approving_authorities'), where('organizationId', '==', user.organizationId));
        const snap = await getDocs(q);
        setAuthorities(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ApprovingAuthority)));
      } catch (err) {
        console.error('Failed to load authorities:', err);
      }
    };
    loadAuthorities();
  }, [user?.organizationId]);

  // Load previous destinations and purposes
  useEffect(() => {
    const loadPreviousData = async () => {
      if (!user?.id || !user?.organizationId) return;
      try {
        // Query without orderBy to avoid needing composite index
        const q = query(
          collection(db, 'fuel_requisitions'),
          where('createdBy', '==', user.id),
          where('organizationId', '==', user.organizationId),
          limit(50)
        );
        const snap = await getDocs(q);

        const destinations = new Set<string>();
        const purposes = new Set<string>();

        snap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.destination) {
            destinations.add(data.destination);
          }
          if (data.purpose) {
            // Split multi-line purposes and add each line
            const purposeLines = data.purpose.split('\n').filter((p: string) => p.trim());
            purposeLines.forEach((p: string) => purposes.add(p.trim()));
          }
        });

        setPreviousDestinations(Array.from(destinations));
        setPreviousPurposes(Array.from(purposes));
      } catch (err) {
        console.error('Failed to load previous data:', err);
      }
    };
    loadPreviousData();
  }, [user?.id, user?.organizationId]);

  // Load last issuance when vehicle is selected
  useEffect(() => {
    const loadLastIssuance = async () => {
      if (!selectedVehicleId || !user?.organizationId) {
        setLastIssuance(null);
        return;
      }
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'fuel_requisitions'),
          where('vehicleId', '==', selectedVehicleId),
          where('status', '==', 'COMPLETED'),
          where('organizationId', '==', user.organizationId),
          orderBy('verifiedAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setLastIssuance({
            id: snap.docs[0].id,
            ...data,
            inclusiveDateFrom: data.inclusiveDateFrom?.toDate?.() || new Date(),
            inclusiveDateTo: data.inclusiveDateTo?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            issuedAt: data.issuedAt?.toDate?.() || null,
            verifiedAt: data.verifiedAt?.toDate?.() || null,
            validUntil: data.validUntil?.toDate?.() || null,
            chargeInvoiceDate: data.chargeInvoiceDate?.toDate?.() || null,
            refuelDate: data.refuelDate?.toDate?.() || null,
            emdValidatedAt: data.emdValidatedAt?.toDate?.() || null,
            effectiveDate: data.effectiveDate?.toDate?.() || null,
          } as FuelRequisition);
        } else {
          setLastIssuance(null);
        }
      } catch (err) {
        console.error('Failed to load last issuance:', err);
        setLastIssuance(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadLastIssuance();
  }, [selectedVehicleId, user?.organizationId]);

  const selectedOffice = useMemo(() => offices.find((o) => o.id === selectedOfficeId), [offices, selectedOfficeId]);
  const filteredVehicles = useMemo(() => {
    const term = vehicleSearch.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((v) => {
      const haystack = `${v.dpwhNumber} ${v.brand} ${v.model} ${v.plateNumber}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [vehicleSearch, vehicles]);
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const approvingAuthority = useMemo(
    () => authorities.find((a) => a.officerId === selectedOfficeId),
    [authorities, selectedOfficeId]
  );
  const selectedSignatory = useMemo(
    () => (selectedOffice?.signatoryId ? signatories[selectedOffice.signatoryId] || null : null),
    [selectedOffice?.signatoryId, signatories]
  );
  const passengersValue = watch('passengers');
  const purposeValue = watch('purpose') || [];
  const destinationRegister = register('destination');

  const addPassenger = () => {
    const name = passengerInput.trim();
    if (!name) return;
    const updated = [...passengerList, name];
    setPassengerList(updated);
    setValue('passengers', updated.join(', '), { shouldValidate: true });
    setPassengerInput('');
  };

  const removePassenger = (index: number) => {
    const updated = passengerList.filter((_, i) => i !== index);
    setPassengerList(updated);
    setValue('passengers', updated.join(', '), { shouldValidate: true });
  };

  const submit = (data: RequestForm) => {
    const purposeText = (Array.isArray(data.purpose) ? data.purpose : [])
      .map((p) => p.trim())
      .filter(Boolean)
      .join('\n');
    onSubmit({
      mode,
      officeId: data.officeId,
      officeName: selectedOffice?.name || '',
      vehicleId: data.vehicleId,
      vehicleDpwhNumber: selectedVehicle?.dpwhNumber,
      vehiclePlateNumber: selectedVehicle?.plateNumber,
      vehicleDescription: `${selectedVehicle?.brand || ''} ${selectedVehicle?.model || ''}`.trim(),
      fuelType: selectedVehicle?.fuelType || 'DIESEL',
      supplierId: data.supplierId,
      supplierName: suppliers.find(s => s.id === data.supplierId)?.name || null,
      passengers: data.passengers,
      inclusiveDateFrom: data.inclusiveDateFrom,
      inclusiveDateTo: data.inclusiveDateTo,
      destination: data.destination,
      purpose: purposeText,
      requestedLiters: parseFloat(data.requestedLiters),
      requestingOfficerId: selectedOffice?.signatoryId || null,
      requestingOfficerName: selectedSignatory?.name || '',
      requestingOfficerPosition: selectedSignatory?.position || '',
      approvingAuthorityId: approvingAuthority?.id || null,
      approvingAuthorityName: approvingAuthority?.name || '',
      approvingAuthorityPosition: approvingAuthority?.position || '',
      authorityPrefix: approvingAuthority?.prefix || 'By Authority of the Regional Director:',
      loadedUpdatedAt,
    });
  };

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Fuel className="h-3 w-3 mr-1" />
              Driver
            </Badge>
            <span className="font-semibold text-gray-900">{mode === 'edit' ? 'Edit Fuel Request' : 'Create Fuel Request'}</span>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {mode === 'edit' && requisition ? (
              <Badge variant="outline" className="text-gray-700 border-gray-200">
                Status: {requisition.status}
              </Badge>
            ) : (
              'Step 1 - Request Details'
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {mode === 'edit' && requisition && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Editing is allowed while the request is {requisition.status}. Saving will resubmit to EMD if it was
            returned.
          </div>
        )}
        <form onSubmit={handleSubmit(submit)} className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Assignment Card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Assignment</p>
                <p className="text-sm text-gray-600">Select the office, vehicle, and supplier.</p>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Office <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('officeId')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select office</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.code} - {office.name}
                    </option>
                  ))}
                </select>
                {errors.officeId && <p className="text-xs text-red-600">{errors.officeId.message}</p>}
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Vehicle <span className="text-red-500">*</span>
                </label>
                <Input
                  label="Search vehicle"
                  placeholder="Search by DPWH no., plate, brand, or model"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="mb-2"
                />
                <select
                  {...register('vehicleId')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select vehicle</option>
                  {filteredVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.dpwhNumber} - {vehicle.brand} {vehicle.model} ({vehicle.plateNumber})
                    </option>
                  ))}
                </select>
                {errors.vehicleId && <p className="text-xs text-red-600">{errors.vehicleId.message}</p>}
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('supplierId')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="text-xs text-red-600">{errors.supplierId.message}</p>}
              </div>
              {(selectedOffice || selectedVehicle) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedOffice && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                      <span className="font-semibold">Requesting Officer:</span> {selectedSignatory ? selectedSignatory.name : 'N/A'}
                    </div>
                  )}
                  {selectedOffice && approvingAuthority && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                      <span className="font-semibold">Approving Authority:</span> {approvingAuthority.name || 'N/A'}
                    </div>
                  )}
                  {selectedVehicle && (
                    <>
                      <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-700">
                        <span className="font-semibold">Fuel Type:</span> DIESEL
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-700">
                        <span className="font-semibold">Plate Number:</span> {selectedVehicle.plateNumber}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Trip Details Card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Trip Details</p>
                <p className="text-sm text-gray-600">Passengers, dates, destination, and purpose.</p>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Passengers <span className="text-red-500">*</span></label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <Input
                    label="Add Passenger"
                    placeholder="e.g., John Doe"
                    value={passengerInput}
                    onChange={(e) => setPassengerInput(e.target.value.toUpperCase())}
                  />
                  <Button type="button" variant="primary" onClick={addPassenger} className="w-full sm:w-auto">
                    Add
                  </Button>
                </div>
                <input type="hidden" value={passengersValue} {...register('passengers')} />
                {passengersValue && !errors.passengers && (
                  <p className="text-xs text-gray-500">Passenger list is maintained below.</p>
                )}
                {passengerList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {passengerList.map((p, idx) => (
                      <span key={`${p}-${idx}`} className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs border border-emerald-100">
                        {p}
                        <button
                          type="button"
                          className="text-emerald-700 hover:text-emerald-900"
                          onClick={() => removePassenger(idx)}
                          aria-label="Remove passenger"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-600">{errors.passengers?.message || 'Add at least one passenger.'}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Requested Liters"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 50"
                  error={errors.requestedLiters?.message}
                  required
                  {...register('requestedLiters')}
                />
                <Input
                  label="Date From"
                  type="date"
                  error={errors.inclusiveDateFrom?.message}
                  required
                  {...register('inclusiveDateFrom')}
                />
                <Input
                  label="Date To"
                  type="date"
                  error={errors.inclusiveDateTo?.message}
                  required
                  {...register('inclusiveDateTo')}
                />
              </div>
              <div className="space-y-2 relative">
                <Input
                  label="Destination"
                  placeholder="e.g., Tuguegarao City"
                  autoComplete="on"
                  error={errors.destination?.message}
                  required
                  toUppercase
                  {...destinationRegister}
                  onFocus={() => setShowDestinationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                  onChange={(e) => {
                    // force uppercase while keeping RHF in sync
                    const upper = e.target.value.toUpperCase();
                    setValue('destination', upper, { shouldValidate: true, shouldTouch: true, shouldDirty: true });
                    destinationRegister.onChange({
                      ...e,
                      target: { ...e.target, value: upper },
                      currentTarget: { ...e.currentTarget, value: upper },
                    });
                  }}
                />

                {/* Suggestions dropdown */}
                {showDestinationSuggestions && previousDestinations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-2 text-xs text-gray-500 font-semibold uppercase border-b">Recent Destinations</div>
                    {previousDestinations.map((dest, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setValue('destination', dest, { shouldValidate: true });
                          setShowDestinationSuggestions(false);
                        }}
                      >
                        {dest}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Purpose(s) <span className="text-red-500">*</span></label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 relative">
                  <div className="flex-1 space-y-2 relative">
                    <Input
                      label="Add Purpose"
                      placeholder="e.g., Official travel for inspection"
                      value={purposeInput}
                      toUppercase
                      showClearButton
                      onChange={(e) => setPurposeInput(e.target.value)}
                      onFocus={() => setShowPurposeSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowPurposeSuggestions(false), 200)}
                    />

                    {/* Suggestions dropdown */}
                    {showPurposeSuggestions && previousPurposes.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div className="p-2 text-xs text-gray-500 font-semibold uppercase border-b">Recent Purposes</div>
                        {previousPurposes.map((purpose, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              setPurposeInput(purpose);
                              setShowPurposeSuggestions(false);
                            }}
                          >
                            {purpose}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const val = purposeInput.trim().toUpperCase();
                      if (!val) return;
                      const updated = [...purposeValue.filter((p: string) => p.trim() !== ''), val];
                      setValue('purpose', updated, { shouldValidate: true });
                      setPurposeInput('');
                    }}
                  >
                    Add
                  </Button>
                </div>
                {purposeValue.length > 0 ? (
                  <ol className="space-y-2 text-sm text-gray-800">
                    {purposeValue.map((p: string, idx: number) => (
                      <li key={`${p}-${idx}`} className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                        <span className="text-blue-700 font-semibold">{idx + 1}.</span>
                        <span className="flex-1">{p}</span>
                        <button
                          type="button"
                          className="text-blue-700 hover:text-blue-900"
                          onClick={() => {
                            const updated = purposeValue.filter((_, i) => i !== idx);
                            setValue('purpose', updated, { shouldValidate: true });
                          }}
                          aria-label="Remove purpose"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-red-600">{errors.purpose?.message || 'Add at least one purpose.'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Last Issuance Info */}
          {lastIssuance && (
            <Card className="bg-amber-50 border border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Last Issuance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 text-amber-900">
                <p>
                  <span className="font-semibold">RIS No:</span> {lastIssuance.risNumber || '—'}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{' '}
                  {lastIssuance.issuedAt ? new Date(lastIssuance.issuedAt).toLocaleDateString() : '—'}
                </p>
                <p>
                  <span className="font-semibold">Quantity:</span> {lastIssuance.actualLiters || lastIssuance.validatedLiters || '—'} L
                </p>
                <p>
                  <span className="font-semibold">Station:</span> {lastIssuance.supplierName || '—'}
                </p>
                <p>
                  <span className="font-semibold">Charge Invoice:</span> {lastIssuance.chargeInvoiceNumber || '—'}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-2">
            {mode === 'edit' && onCancel && (
              <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={isSubmitting}>
              <FileText className="h-4 w-4 mr-2" />
              {mode === 'edit' ? 'Save Changes' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default FuelRequestForm;
