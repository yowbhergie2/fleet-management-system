import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, doc, getDocs, query, updateDoc, where, orderBy, Timestamp } from 'firebase/firestore';
import { Fuel, CalendarClock, History, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Badge } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { FuelPrice, Supplier } from '@/types';

const priceSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  pricePerLiter: z
    .string()
    .min(1, 'Price is required')
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Enter a valid price'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
});

type PriceForm = z.infer<typeof priceSchema>;
const DEFAULT_FUEL_TYPE: FuelPrice['fuelType'] = 'DIESEL';

const formatCurrency = (amount: number | null | undefined) =>
  typeof amount === 'number'
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
    : '—';

const formatDate = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(value)
    : '—';

const formatDateTime = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(value)
    : '—';

const nextTuesday = () => {
  const today = new Date();
  const result = new Date(today);
  const day = today.getDay(); // 0 = Sun
  const diff = (2 - day + 7) % 7 || 7; // 2 = Tuesday
  result.setDate(today.getDate() + diff);
  return result.toISOString().split('T')[0];
};

export function FuelPricesPage() {
  const user = useUser();
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: 'success' | 'error' | 'confirm';
    title: string;
    description: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PriceForm>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      effectiveDate: nextTuesday(),
    },
  });

  const currentByType = useMemo(() => {
    const map: Record<string, FuelPrice | undefined> = {};
    prices.forEach((p) => {
      if (p.isCurrent && !p.isVoided) map[p.fuelType] = p;
    });
    return map;
  }, [prices]);

  const loadPrices = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'fuel_prices'), where('organizationId', '==', user.organizationId), orderBy('effectiveDate', 'desc'));
      const snap = await getDocs(q);
      const rows = snap.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
                effectiveDate: d.data().effectiveDate?.toDate() || new Date(),
                updatedAt: d.data().updatedAt?.toDate() || d.data().createdAt?.toDate() || new Date(),
                createdAt: d.data().createdAt?.toDate() || new Date(),
                isVoided: d.data().isVoided ?? false,
                voidReason: d.data().voidReason ?? null,
                voidedAt: d.data().voidedAt?.toDate?.() || null,
                voidedBy: d.data().voidedBy ?? null,
                voidedByName: d.data().voidedByName ?? null,
              } as FuelPrice)
          );
      setPrices(rows);
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Unable to load fuel prices.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    if (!user?.organizationId) return;
    try {
      const q = query(
        collection(db, 'suppliers'),
        where('organizationId', '==', user.organizationId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
            updatedAt: d.data().updatedAt?.toDate() || new Date(),
          } as Supplier)
      );
      setSuppliers(rows);
    } catch (err) {
      console.error(err);
      setSuppliers([]);
    }
  };

  useEffect(() => {
    loadPrices();
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const onSubmit = async (data: PriceForm) => {
    if (!user?.organizationId) {
      setModal({ type: 'error', title: 'Error', description: 'No organization found for this user.' });
      return;
    }
    if (!suppliers.length) {
      setModal({ type: 'error', title: 'Error', description: 'No active suppliers found. Add a supplier first.' });
      return;
    }
    try {
      setIsLoading(true);
      const priceValue = parseFloat(data.pricePerLiter.replace(/,/g, ''));
      const effective = Timestamp.fromDate(new Date(data.effectiveDate));
      const fuelType = DEFAULT_FUEL_TYPE;
      const supplier = suppliers.find((s) => s.id === data.supplierId);
      if (!supplier) {
        setModal({ type: 'error', title: 'Error', description: 'Supplier not found.' });
        setIsLoading(false);
        return;
      }

      // Mark previous prices of this fuel type as not current
      const sameType = prices.filter((p) => p.fuelType === fuelType && p.isCurrent && p.supplierId === supplier.id);
      for (const p of sameType) {
        await updateDoc(doc(db, 'fuel_prices', p.id), {
          isCurrent: false,
          updatedAt: Timestamp.now(),
        });
      }

      await addDoc(collection(db, 'fuel_prices'), {
        fuelType,
        supplierId: supplier.id,
        supplierName: supplier.name,
        pricePerLiter: priceValue,
        effectiveDate: effective,
        isCurrent: true,
        isVoided: false,
        voidReason: null,
        voidedAt: null,
        voidedBy: null,
        voidedByName: null,
        updatedBy: user.id,
        updatedByName: user.displayName,
        organizationId: user.organizationId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setModal({ type: 'success', title: 'Saved', description: 'Fuel price updated.' });
      reset({
        supplierId: '',
        pricePerLiter: '',
        effectiveDate: nextTuesday(),
      });
      await loadPrices();
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Failed to save fuel price.' });
    } finally {
      setIsLoading(false);
    }
  };

  const history = useMemo(() => {
    return [...prices].sort((a, b) => {
      const aTime = (a as any).updatedAt?.getTime?.() ?? a.createdAt?.getTime?.() ?? 0;
      const bTime = (b as any).updatedAt?.getTime?.() ?? b.createdAt?.getTime?.() ?? 0;
      return bTime - aTime;
    });
  }, [prices]);

  const handleVoid = async (price: FuelPrice) => {
    if (!user || user.role !== 'admin') return;
    const reason = window.prompt('Enter reason for voiding this price entry:');
    if (reason === null) return;
    setVoidingId(price.id);
    try {
      await updateDoc(doc(db, 'fuel_prices', price.id), {
        isVoided: true,
        isCurrent: false,
        voidReason: reason || 'Voided',
        voidedAt: Timestamp.now(),
        voidedBy: user.id,
        voidedByName: user.displayName,
        updatedAt: Timestamp.now(),
      });
      await loadPrices();
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Failed to void fuel price.' });
    } finally {
      setVoidingId(null);
    }
  };

  return (
    <DashboardLayout>
      <Modal
        open={!!modal}
        title={modal?.title}
        description={modal?.description}
        onClose={() => setModal(null)}
      />
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-600 to-sky-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 w-full max-w-3xl">
              <p className="uppercase text-xs font-semibold tracking-[0.15em] text-blue-100">
                DPWH Regional Office II
              </p>
              <div className="flex flex-col gap-4">
                <div className="max-w-2xl">
                  <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                    Fuel Price Management
                  </h1>
                  <p className="text-blue-100 mt-3 text-base">
                    Manage Diesel price updates. The latest entry is marked as current; void entries remain in history with a reason.
                  </p>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 bg-white/10 border border-white/30 rounded-xl px-4 py-3 w-fit">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Syncing with Firestore...</span>
                  </div>
                )}
              </div>
              <p className="text-blue-100 text-sm">
                Track historical price changes and manage current diesel prices across all suppliers.
              </p>
            </div>
            <div className="bg-white/20 border-2 border-white/40 rounded-2xl p-6 w-full max-w-sm backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-white">Price Updates</span>
                <Badge className="bg-blue-500/30 text-white border-blue-300/50 shadow-lg">History</Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-blue-50 uppercase tracking-wide">Active suppliers</p>
                    <p className="text-3xl font-bold text-white mt-1">{suppliers.filter((s) => prices.some((p) => p.supplierId === s.id && p.isCurrent && !p.isVoided)).length}</p>
                  </div>
                  <div className="bg-blue-400/20 p-3 rounded-xl">
                    <Fuel className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-blue-50 uppercase tracking-wide">Total updates</p>
                    <p className="text-3xl font-bold text-white mt-1">{prices.length}</p>
                  </div>
                  <div className="bg-blue-400/20 p-3 rounded-xl">
                    <CalendarClock className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.length === 0 && (
            <Card className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-blue-600" />
                  No suppliers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-gray-600">
                Add suppliers to set prices per station.
              </CardContent>
            </Card>
          )}
          {suppliers.map((supplier) => {
            const current = prices.find(
              (p) => p.supplierId === supplier.id && p.isCurrent && !p.isVoided
            );
            return (
              <Card key={supplier.id} className="border-0 shadow-lg shadow-blue-50/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-blue-600" />
                    {supplier.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(current?.pricePerLiter ?? null)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Effective {current?.effectiveDate ? formatDate(current.effectiveDate) : '-'}
                  </p>
                  {current?.updatedByName && (
                    <p className="text-xs text-gray-500 mt-1">By {current.updatedByName}</p>
                  )}
                  {current?.isCurrent && (
                    <Badge variant="info" className="mt-2">
                      Current
                    </Badge>
                  )}
                  {current?.isVoided && (
                    <Badge variant="destructive" className="mt-2">
                      Voided
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-xl border-0 lg:col-span-1" id="price-form">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-blue-600" />
                Update price
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('supplierId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isLoading || suppliers.length === 0}
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && <p className="text-sm text-red-600 mt-1">{errors.supplierId.message}</p>}
                </div>

                <Input
                  type="number"
                  step="0.01"
                  label="Price per liter (PHP)"
                  placeholder="e.g., 57.60"
                  error={errors.pricePerLiter?.message}
                  required
                  {...register('pricePerLiter')}
                />

                <Input
                  type="date"
                  label="Effective date"
                  error={errors.effectiveDate?.message}
                  required
                  {...register('effectiveDate')}
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                    Save price
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 lg:col-span-2">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Price history
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b text-sm text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-left">Price</th>
                      <th className="px-4 py-3 text-left">Effective</th>
                      <th className="px-4 py-3 text-left">Updated</th>
                      <th className="px-4 py-3 text-left">Updated By</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      {user?.role === 'admin' && <th className="px-4 py-3 text-left">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {history.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-center text-gray-500" colSpan={user?.role === 'admin' ? 8 : 7}>
                          No price history yet.
                        </td>
                      </tr>
                    )}
                    {history.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">{row.supplierName || '—'}</td>
                        <td className="px-4 py-3 text-gray-800">{formatCurrency(row.pricePerLiter)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(row.effectiveDate)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDateTime((row as any).updatedAt || row.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-700">{row.updatedByName || '—'}</td>
                        <td className="px-4 py-3">
                          {row.isVoided ? (
                            <Badge variant="destructive">Voided</Badge>
                          ) : row.isCurrent ? (
                            <Badge variant="success">Current</Badge>
                          ) : (
                            <Badge variant="default">Archived</Badge>
                          )}
                          {row.voidReason && (
                            <p className="text-xs text-gray-500 mt-1">Reason: {row.voidReason}</p>
                          )}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-4 py-3">
                            {!row.isVoided && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVoid(row)}
                                isLoading={voidingId === row.id}
                              >
                                Void
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default FuelPricesPage;
