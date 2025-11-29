import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Truck, Plus, Edit2, Trash2, Search, FileSpreadsheet, Download, Wrench, Loader2 } from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';

type VehicleStatus = 'Active' | 'Under Maintenance' | 'Retired';
type VehicleFuel = 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid';

const vehicleSchema = z.object({
  dpwhNumber: z.string().min(1, 'DPWH Number is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  plateNumber: z.string().min(1, 'Plate Number is required'),
  year: z.string().optional(),
  fuelType: z.literal('Diesel').optional(), // Only Diesel is supported
  status: z.enum(['Active', 'Under Maintenance', 'Retired']).optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;
type Vehicle = Omit<VehicleFormData, 'year' | 'fuelType' | 'status'> & {
  id: string;
  year?: number;
  fuelType?: VehicleFuel;
  status?: VehicleStatus;
  organizationId?: string;
};

export function VehiclesPage() {
  const user = useUser();
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modal, setModal] = useState<{
    type: 'success' | 'error' | 'confirm';
    title: string;
    description: string;
    onConfirm?: () => Promise<void> | void;
  } | null>(null);

  const showError = (message: string, title = 'Error') => setModal({ type: 'error', title, description: message });
  const showSuccess = (message: string, title = 'Success') =>
    setModal({ type: 'success', title, description: message });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      status: 'Active',
      fuelType: 'Diesel',
    },
  });

  const stats = [
    { label: 'Total fleet', value: vehicles.length, accent: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: vehicles.filter((v) => v.status === 'Active').length, accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Under maintenance', value: vehicles.filter((v) => v.status === 'Under Maintenance').length, accent: 'bg-amber-50 text-amber-700' },
  ];

  const loadVehicles = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'vehicles'),
        where('organizationId', '==', user.organizationId)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({ ...(d.data() as Vehicle), id: d.id }));
      setVehicles(loaded.length ? loaded : []);
    } catch (err) {
      console.error(err);
      showError('Unable to load vehicles from Firestore. Please check permissions.');
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load vehicles from Firestore
  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const onSubmit = async (data: VehicleFormData) => {
    if (!user?.organizationId) {
      showError('No organization found for this user.');
      return;
    }

    // Check for duplicate DPWH Number
    const duplicateDpwh = vehicles.find(
      (v) => v.dpwhNumber.toLowerCase() === data.dpwhNumber.toLowerCase() && v.id !== editingVehicle?.id
    );
    if (duplicateDpwh) {
      showError(`DPWH Number "${data.dpwhNumber}" already exists.`, 'Duplicate Detected');
      return;
    }

    // Check for duplicate Plate Number
    const duplicatePlate = vehicles.find(
      (v) => v.plateNumber.toLowerCase() === data.plateNumber.toLowerCase() && v.id !== editingVehicle?.id
    );
    if (duplicatePlate) {
      showError(`Plate Number "${data.plateNumber}" already exists.`, 'Duplicate Detected');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        ...data,
        year: data.year ? parseInt(data.year) : undefined,
        fuelType: data.fuelType || 'Diesel',
        status: data.status || 'Active',
        organizationId: user.organizationId,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), payload);
        await loadVehicles();
        showSuccess('Vehicle updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'vehicles'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await loadVehicles();
        showSuccess('Vehicle added successfully!');
      }
      // Clear all fields
      reset({
        dpwhNumber: '',
        brand: '',
        model: '',
        plateNumber: '',
        year: '',
        fuelType: 'Diesel',
        status: 'Active',
      });
      setIsFormOpen(false);
      setEditingVehicle(null);
    } catch (err) {
      console.error(err);
      showError('Failed to save vehicle.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    reset({
      dpwhNumber: vehicle.dpwhNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      year: vehicle.year?.toString(),
      fuelType: 'Diesel', // Always Diesel
      status: vehicle.status,
    });
    setIsFormOpen(true);
    setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('input[name="dpwhNumber"]');
      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInput.focus();
      }
    }, 100);
  };

  const handleDelete = (id: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete Vehicle',
      description: 'Are you sure you want to delete this vehicle?',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDoc(doc(db, 'vehicles', id));
          await loadVehicles();
          showSuccess('Vehicle deleted successfully!');
        } catch (err) {
          console.error(err);
          showError('Failed to delete vehicle.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const normalizeHeader = (value: string) =>
    value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const handleCSVUpload = async (file: File) => {
    if (!user?.organizationId) {
      showError('No organization found for this user.');
      return;
    }
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = (event.target?.result as string) || '';
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          showError('The CSV file is empty or missing rows.');
          setIsLoading(false);
          return;
        }

        const headerColumns = lines[0].split(',').map(normalizeHeader);
        const headerMap: Partial<Record<'dpwhNumber' | 'brand' | 'model' | 'plateNumber', number>> = {};

        headerColumns.forEach((col, index) => {
          if (col.includes('dpwh')) headerMap.dpwhNumber = index;
          if (col === 'brand') headerMap.brand = index;
          if (col === 'model') headerMap.model = index;
          if (col.startsWith('plate')) headerMap.plateNumber = index;
        });

        const missing = ['dpwhNumber', 'brand', 'model', 'plateNumber'].filter(
          (key) => headerMap[key as keyof typeof headerMap] === undefined
        );

        if (missing.length > 0) {
          showError(`Missing required columns: ${missing.join(', ')}`);
          setIsLoading(false);
          return;
        }

        const imported: Vehicle[] = [];
        lines.slice(1).forEach((line, lineIndex) => {
          const cells = line.split(',').map((cell) => cell.trim());
          const dpwhNumber = cells[headerMap.dpwhNumber!];
          const brand = cells[headerMap.brand!];
          const model = cells[headerMap.model!];
          const plateNumber = cells[headerMap.plateNumber!];

          if (dpwhNumber && brand && model && plateNumber) {
            imported.push({
              id: `import-${Date.now()}-${lineIndex}`,
              dpwhNumber,
              brand,
              model,
              plateNumber,
              fuelType: 'Diesel',
              status: 'Active',
              organizationId: user.organizationId,
            });
          }
        });

        if (imported.length === 0) {
          showError('No valid vehicle rows were found in the CSV.');
          setIsLoading(false);
          return;
        }

        // Fetch existing vehicles for this org to update matches
        const existingSnap = await getDocs(
          query(collection(db, 'vehicles'), where('organizationId', '==', user.organizationId))
        );
        const existingMap = new Map<string, string>(); // dpwhNumber lower -> docId
        existingSnap.forEach((docSnap) => {
          const data = docSnap.data() as Vehicle;
          if (data.dpwhNumber) {
            existingMap.set(data.dpwhNumber.toLowerCase(), docSnap.id);
          }
        });

        const batch = writeBatch(db);
        imported.forEach((vehicle) => {
          const lower = vehicle.dpwhNumber.toLowerCase();
          const docId = existingMap.get(lower);
          const payload = {
            ...vehicle,
            isActive: true,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          };

          if (docId) {
            batch.set(doc(db, 'vehicles', docId), payload, { merge: true });
          } else {
            const newDoc = doc(collection(db, 'vehicles'));
            batch.set(newDoc, payload);
          }
        });

        await batch.commit();

        // Reload list from Firestore
        const reloaded = await getDocs(
          query(collection(db, 'vehicles'), where('organizationId', '==', user.organizationId))
        );
        const merged = reloaded.docs.map((d) => ({ ...(d.data() as Vehicle), id: d.id }));
        setVehicles(merged);

        showSuccess(`Imported ${imported.length} vehicle${imported.length > 1 ? 's' : ''} from CSV`);
      } catch (err) {
        console.error(err);
        showError('Failed to import CSV.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      showError('Could not read the CSV file.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleCSVUpload(file);
    }
    event.target.value = '';
  };

  const downloadTemplate = () => {
    const template = 'DPWH No.,Brand,Model,Plate No.\nDPWH-RO2-004,Isuzu,Traviz,AAA 1234\nDPWH-RO2-005,Toyota,HiAce Commuter,BBB 5678';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicle-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.dpwhNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Modal
        open={!!modal}
        title={modal?.title}
        description={modal?.description}
        onClose={() => setModal(null)}
        actions={
          modal?.type === 'confirm'
            ? [
                { label: 'Cancel', variant: 'outline', onClick: () => setModal(null) },
                {
                  label: 'Confirm',
                  onClick: async () => {
                    const fn = modal?.onConfirm;
                    setModal(null);
                    if (fn) await fn();
                  },
                },
              ]
            : undefined
        }
      />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%)]" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs uppercase tracking-wide">
                <Wrench className="h-4 w-4" />
                Fleet management
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mt-3">Vehicle Management</h1>
              <p className="text-blue-100 mt-2 max-w-2xl">
                CRUD for DPWH fleet vehicles. Focus on DPWH No., Brand, Model, and Plate No. with quick CSV import.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button
                  onClick={() => {
                    setEditingVehicle(null);
                    reset();
                    setIsFormOpen(!isFormOpen);
                  }}
                  className="bg-white text-blue-700 hover:bg-blue-50"
                  disabled={isLoading}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {isFormOpen ? 'Close form' : 'Add Vehicle'}
                </Button>
                <Button
                  onClick={() => csvInputRef.current?.click()}
                  className="bg-white/15 text-white border border-white/30 hover:bg-white/20"
                  disabled={isLoading}
                >
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                  Import CSV
                </Button>
                <input
                  ref={csvInputRef}
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur w-full max-w-sm">
              <p className="text-blue-100 text-sm font-medium">Ready for dispatch</p>
              <p className="text-2xl font-bold">{vehicles.filter((v) => v.status === 'Active').length} vehicles</p>
              <p className="text-xs text-blue-100 mt-1">Auto-filtered to active status</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/10 rounded-xl px-3 py-2">
                  <p className="text-blue-100">Under maintenance</p>
                  <p className="font-semibold">{vehicles.filter((v) => v.status === 'Under Maintenance').length}</p>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2">
                  <p className="text-blue-100">Fuel type: Diesel</p>
                  <p className="font-semibold">{vehicles.filter((v) => v.fuelType === 'Diesel').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((item) => (
            <Card key={item.label} className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`inline-flex items-center px-3 py-2 rounded-xl text-xl font-bold ${item.accent}`}>
                  {item.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CSV Import Help */}
        <Card className="border-0 shadow-lg shadow-blue-50/70">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                CSV import guide
              </CardTitle>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-gray-700">
            <p>Accepted columns (required): <strong>DPWH No., Brand, Model, Plate No.</strong></p>
            <p className="mt-2">Upload a CSV to bulk add or update vehicles. Existing DPWH Nos. are updated.</p>
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        {isFormOpen && (
          <Card className="shadow-xl border-0" id="vehicle-form">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-xl">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="DPWH Number"
                    placeholder="e.g., DPWH-RO2-001"
                    error={errors.dpwhNumber?.message}
                    required
                    {...register('dpwhNumber')}
                  />
                  <Input
                    label="Plate Number"
                    placeholder="e.g., ABC 1234"
                    error={errors.plateNumber?.message}
                    required
                    {...register('plateNumber')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Brand"
                    placeholder="e.g., Toyota"
                    error={errors.brand?.message}
                    required
                    {...register('brand')}
                  />
                  <Input
                    label="Model"
                    placeholder="e.g., Hilux 2024"
                    error={errors.model?.message}
                    required
                    {...register('model')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    label="Year"
                    placeholder="e.g., 2024"
                    error={errors.year?.message}
                    {...register('year')}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fuel Type
                    </label>
                    <input
                      type="text"
                      value="Diesel"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">All vehicles use Diesel fuel</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingVehicle(null);
                      reset({
                        dpwhNumber: '',
                        brand: '',
                        model: '',
                        plateNumber: '',
                        year: '',
                        fuelType: 'Diesel',
                        status: 'Active',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                    {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search & List */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-xl">Fleet Vehicles ({filteredVehicles.length})</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search DPWH No., brand, model, or plate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing with Firestore...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DPWH No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plate No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fuel Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.dpwhNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vehicle.brand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vehicle.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vehicle.plateNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vehicle.fuelType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            vehicle.status === 'Active'
                              ? 'success'
                              : vehicle.status === 'Under Maintenance'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {vehicle.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            disabled={isLoading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredVehicles.length === 0 && (
                <div className="text-center py-12">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No vehicles found</p>
                </div>
              )}
            </div>

            <div className="lg:hidden space-y-3 p-4">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">DPWH No.</p>
                      <p className="font-semibold text-gray-900">{vehicle.dpwhNumber}</p>
                    </div>
                    <Badge variant={vehicle.status === 'Active' ? 'success' : vehicle.status === 'Under Maintenance' ? 'warning' : 'default'}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">Brand</p>
                      <p className="text-gray-800">{vehicle.brand}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Model</p>
                      <p className="text-gray-800">{vehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Plate</p>
                      <p className="text-gray-800">{vehicle.plateNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fuel</p>
                      <p className="text-gray-800">{vehicle.fuelType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end mt-4">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredVehicles.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-6">No vehicles found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
