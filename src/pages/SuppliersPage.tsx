import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus, Edit2, Trash2, Search, Loader2, CheckCircle2 } from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { Supplier } from '@/types';

type SupplierStatus = 'ACTIVE' | 'INACTIVE';

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  address: z.string().min(1, 'Address is required'),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export function SuppliersPage() {
  const user = useUser();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
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
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      status: 'ACTIVE',
    },
  });

  const nameValue = watch('name');
  const addressValue = watch('address');

  const STORAGE_KEYS = {
    name: 'supplier_name_suggestions',
    address: 'supplier_address_suggestions',
  };

  const loadLocalSuggestions = (key: string): string[] => {
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

  const addSuggestion = (key: 'name' | 'address', value: string) => {
    const clean = value.trim();
    if (clean.length < 2) return;
    const current = key === 'name' ? nameSuggestions : addressSuggestions;
    const next = [clean, ...current.filter((v) => v !== clean)].slice(0, 15);
    if (key === 'name') setNameSuggestions(next);
    if (key === 'address') setAddressSuggestions(next);
    persistSuggestions(STORAGE_KEYS[key], next);
  };

  const stats = [
    { label: 'Total Suppliers', value: suppliers.length, accent: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: suppliers.filter((s) => s.status === 'ACTIVE').length, accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Inactive', value: suppliers.filter((s) => s.status === 'INACTIVE').length, accent: 'bg-gray-50 text-gray-700' },
  ];

  const loadSuppliers = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'suppliers'),
        where('organizationId', '==', user.organizationId)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      } as Supplier));
      setSuppliers(loaded.length ? loaded : []);
    } catch (err) {
      console.error(err);
      showError('Unable to load suppliers from Firestore. Please check permissions.');
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  useEffect(() => {
    setNameSuggestions(loadLocalSuggestions(STORAGE_KEYS.name));
    setAddressSuggestions(loadLocalSuggestions(STORAGE_KEYS.address));
  }, []);

  const onSubmit = async (data: SupplierFormData) => {
    if (!user?.organizationId) {
      showError('No organization found for this user.');
      return;
    }

    // Check for duplicate supplier name
    const duplicateName = suppliers.find(
      (s) => s.name.toLowerCase() === data.name.toLowerCase() && s.id !== editingSupplier?.id
    );
    if (duplicateName) {
      showError(`Supplier "${data.name}" already exists.`, 'Duplicate Detected');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        name: data.name,
        address: data.address,
        contactPerson: data.contactPerson || null,
        contactNumber: data.contactNumber || null,
        status: (data.status || 'ACTIVE') as SupplierStatus,
        organizationId: user.organizationId,
        updatedAt: serverTimestamp(),
      };

      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), payload);
        await loadSuppliers();
        showSuccess('Supplier updated successfully!');
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await loadSuppliers();
        showSuccess('Supplier added successfully!');
      }

      // Save to autocomplete suggestions
      if (data.name) addSuggestion('name', data.name);
      if (data.address) addSuggestion('address', data.address);

      reset({
        name: '',
        address: '',
        contactPerson: '',
        contactNumber: '',
        status: 'ACTIVE',
      });
      setIsFormOpen(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
      showError('Failed to save supplier.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      name: supplier.name,
      address: supplier.address,
      contactPerson: supplier.contactPerson || '',
      contactNumber: supplier.contactNumber || '',
      status: supplier.status,
    });
    setIsFormOpen(true);
    setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('input[name="name"]');
      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInput.focus();
      }
    }, 100);
  };

  const handleDelete = (id: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete Supplier',
      description: 'Are you sure you want to delete this supplier? This action cannot be undone.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDoc(doc(db, 'suppliers', id));
          await loadSuppliers();
          showSuccess('Supplier deleted successfully!');
        } catch (err) {
          console.error(err);
          showError('Failed to delete supplier.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setModal({
      type: 'confirm',
      title: `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} Supplier`,
      description: `Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} "${supplier.name}"?`,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await updateDoc(doc(db, 'suppliers', supplier.id), {
            status: newStatus,
            updatedAt: serverTimestamp(),
          });
          await loadSuppliers();
          showSuccess(`Supplier ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully!`);
        } catch (err) {
          console.error(err);
          showError('Failed to update supplier status.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.contactNumber && s.contactNumber.includes(searchTerm))
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
      <div className="space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-600 to-blue-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 w-full max-w-3xl">
              <p className="uppercase text-xs font-semibold tracking-[0.15em] text-indigo-100">
                DPWH Regional Office II
              </p>
              <div className="flex flex-col gap-4">
                <div className="max-w-2xl">
                  <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                    Supplier Management
                  </h1>
                  <p className="text-indigo-100 mt-3 text-base">
                    Manage fuel suppliers for your organization. Add supplier details, contact information, and status.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      setEditingSupplier(null);
                      reset();
                      setIsFormOpen(!isFormOpen);
                    }}
                    size="sm"
                    className="bg-white text-indigo-700 hover:bg-indigo-50"
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isFormOpen ? 'Close form' : 'Add Supplier'}
                  </Button>
                </div>
              </div>
              <p className="text-indigo-100 text-sm">
                Maintain an accurate database of fuel suppliers and their contact information.
              </p>
            </div>
            <div className="bg-white/20 border-2 border-white/40 rounded-2xl p-6 w-full max-w-sm backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-white">Suppliers</span>
                <Badge className="bg-indigo-500/30 text-white border-indigo-300/50 shadow-lg">Active</Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-indigo-50 uppercase tracking-wide">Active suppliers</p>
                    <p className="text-3xl font-bold text-white mt-1">{suppliers.filter((s) => s.status === 'ACTIVE').length}</p>
                  </div>
                  <div className="bg-indigo-400/20 p-3 rounded-xl">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-indigo-50 uppercase tracking-wide">Total suppliers</p>
                    <p className="text-3xl font-bold text-white mt-1">{suppliers.length}</p>
                  </div>
                  <div className="bg-indigo-400/20 p-3 rounded-xl">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((item) => (
            <Card key={item.label} className="border-0 shadow-lg shadow-indigo-50/70">
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

        {/* Add/Edit Form */}
        {isFormOpen && (
          <Card className="shadow-xl border-0" id="supplier-form">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="text-xl">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Input
                      label="Supplier Name"
                      placeholder="e.g., Petron Gas Station"
                      error={errors.name?.message}
                      required
                      toUppercase
                      autoComplete="organization"
                      {...register('name')}
                      onFocus={() => setShowNameDropdown(true)}
                      onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)}
                    />
                    {showNameDropdown && nameSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b bg-gray-50">
                          Recent Supplier Names
                        </div>
                        {nameSuggestions
                          .filter((s) => !nameValue || s.toLowerCase().includes(nameValue.toLowerCase()))
                          .slice(0, 8)
                          .map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                              onClick={() => {
                                const event = { target: { name: 'name', value: suggestion } } as any;
                                register('name').onChange(event);
                                setShowNameDropdown(false);
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      label="Address"
                      placeholder="e.g., 123 Main St, Tuguegarao City"
                      error={errors.address?.message}
                      required
                      autoComplete="street-address"
                      {...register('address')}
                      onFocus={() => setShowAddressDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAddressDropdown(false), 200)}
                    />
                    {showAddressDropdown && addressSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b bg-gray-50">
                          Recent Addresses
                        </div>
                        {addressSuggestions
                          .filter((s) => !addressValue || s.toLowerCase().includes(addressValue.toLowerCase()))
                          .slice(0, 8)
                          .map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                              onClick={() => {
                                const event = { target: { name: 'address', value: suggestion } } as any;
                                register('address').onChange(event);
                                setShowAddressDropdown(false);
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contact Person"
                    placeholder="e.g., Juan Dela Cruz (Optional)"
                    error={errors.contactPerson?.message}
                    {...register('contactPerson')}
                  />
                  <Input
                    label="Contact Number"
                    placeholder="e.g., 09171234567 (Optional)"
                    error={errors.contactNumber?.message}
                    {...register('contactNumber')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingSupplier(null);
                      reset({
                        name: '',
                        address: '',
                        contactPerson: '',
                        contactNumber: '',
                        status: 'ACTIVE',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                    {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search & List */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-xl">Suppliers ({filteredSuppliers.length})</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      Supplier Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Person
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Number
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
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {supplier.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {supplier.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.contactPerson || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.contactNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(supplier)}
                          disabled={isLoading}
                        >
                          <Badge
                            variant={supplier.status === 'ACTIVE' ? 'success' : 'default'}
                            className="cursor-pointer hover:opacity-80"
                          >
                            {supplier.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            disabled={isLoading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
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
              {filteredSuppliers.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No suppliers found</p>
                </div>
              )}
            </div>

            <div className="lg:hidden space-y-3 p-4">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">Supplier</p>
                      <p className="font-semibold text-gray-900">{supplier.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(supplier)}
                      disabled={isLoading}
                    >
                      <Badge variant={supplier.status === 'ACTIVE' ? 'success' : 'default'}>
                        {supplier.status}
                      </Badge>
                    </button>
                  </div>
                  <div className="mt-3 text-sm space-y-1">
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="text-gray-800">{supplier.address}</p>
                    </div>
                    {supplier.contactPerson && (
                      <div>
                        <p className="text-gray-500">Contact Person</p>
                        <p className="text-gray-800">{supplier.contactPerson}</p>
                      </div>
                    )}
                    {supplier.contactNumber && (
                      <div>
                        <p className="text-gray-500">Contact Number</p>
                        <p className="text-gray-800">{supplier.contactNumber}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 justify-end mt-4">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-6">No suppliers found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
