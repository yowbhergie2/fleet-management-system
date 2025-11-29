import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Edit2, Trash2, Search, Loader2, History, DollarSign, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  Timestamp,
} from 'firebase/firestore';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { Contract, Supplier, ContractTransaction, ContractTransactionType } from '@/types';

const contractSchema = z.object({
  contractNumber: z
    .string()
    .min(1, 'Contract number is required')
    .regex(/^\d{2}GB\d{3}$/i, 'Format: YYGBNNN (e.g., 25GB002)'),
  supplierId: z.string().min(1, 'Supplier is required'),
  totalAmount: z.string().min(1, 'Total amount is required'),
  startDate: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

export function ContractsPage() {
  const user = useUser();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<ContractTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [nextContractNumber, setNextContractNumber] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentRemarks, setAdjustmentRemarks] = useState<string>('');
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
  });

  const computeNextContractNumber = (list: Contract[]) => {
    const yearPrefix = new Date().getFullYear().toString().slice(-2);
    let maxSeq = 0;
    list.forEach((c) => {
      const match = c.contractNumber?.toString().toUpperCase().match(/^(\d{2})GB(\d{1,3})$/);
      if (match && match[1] === yearPrefix) {
        const seq = parseInt(match[2], 10);
        if (!Number.isNaN(seq)) {
          maxSeq = Math.max(maxSeq, seq);
        }
      }
    });
    return `${yearPrefix}GB${String(maxSeq + 1).padStart(3, '0')}`;
  };

  const formatContractNumber = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    const match = trimmed.match(/^(\d{2})GB(\d{1,3})$/);
    if (match) {
      return `${match[1]}GB${String(parseInt(match[2], 10)).padStart(3, '0')}`;
    }
    return trimmed.replace(/\s+/g, '');
  };

  const formatAmount = (value: string) => {
    const sanitized = value.replace(/,/g, '').replace(/[^\d.]/g, '');
    if (!sanitized) return '';
    const [intPart, decPart] = sanitized.split('.');
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  };

  const parseAmountNumber = (value: string) => parseFloat(value.replace(/,/g, ''));

  const watchTotalAmount = watch('totalAmount') || '';

  const stats = [
    { label: 'Total Contracts', value: contracts.length, accent: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: contracts.filter((c) => c.status === 'ACTIVE').length, accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Exhausted', value: contracts.filter((c) => c.status === 'EXHAUSTED').length, accent: 'bg-red-50 text-red-700' },
  ];

  const loadSuppliers = async () => {
    if (!user?.organizationId) return;
    try {
      const q = query(
        collection(db, 'suppliers'),
        where('organizationId', '==', user.organizationId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      } as Supplier));
      setSuppliers(loaded);
    } catch (err) {
      console.error(err);
      showError('Unable to load suppliers.');
    }
  };

  const loadContracts = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'contracts'),
        where('organizationId', '==', user.organizationId)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        startDate: d.data().startDate?.toDate() || d.data().createdAt?.toDate() || null,
        exhaustedAt: d.data().exhaustedAt?.toDate() || null,
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      } as Contract));
      setContracts(loaded.length ? loaded : []);
      setNextContractNumber(computeNextContractNumber(loaded));
    } catch (err) {
      console.error(err);
      showError('Unable to load contracts from Firestore. Please check permissions.');
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (contractId: string) => {
    try {
      const q = query(
        collection(db, 'contract_transactions'),
        where('contractId', '==', contractId)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      } as ContractTransaction));
      setTransactions(loaded.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err) {
      console.error(err);
      showError('Unable to load transaction history.');
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const onSubmit = async (data: ContractFormData) => {
    if (!user?.organizationId) {
      showError('No organization found for this user.');
      return;
    }

    // Check for duplicate contract number
    const duplicateNumber = contracts.find(
      (c) => c.contractNumber.toLowerCase() === data.contractNumber.toLowerCase() && c.id !== editingContract?.id
    );
    if (duplicateNumber) {
      showError(`Contract number "${data.contractNumber}" already exists.`, 'Duplicate Detected');
      return;
    }

    try {
      setIsLoading(true);
      const totalAmount = parseAmountNumber(data.totalAmount);
      const supplier = suppliers.find((s) => s.id === data.supplierId);

      if (!supplier) {
        showError('Selected supplier not found.');
        return;
      }

      const startDateValue = data.startDate ? new Date(data.startDate) : editingContract?.startDate || new Date();
      const payload = {
        contractNumber: data.contractNumber,
        supplierId: data.supplierId,
        supplierName: supplier.name,
        totalAmount,
        remainingBalance: totalAmount,
        startDate: Timestamp.fromDate(startDateValue),
        status: 'ACTIVE' as const,
        exhaustedAt: null,
        organizationId: user.organizationId,
        updatedAt: serverTimestamp(),
      };

      if (editingContract) {
        // When editing, preserve the remaining balance
        await updateDoc(doc(db, 'contracts', editingContract.id), {
          contractNumber: data.contractNumber,
          supplierId: data.supplierId,
          supplierName: supplier.name,
          totalAmount,
          startDate: Timestamp.fromDate(startDateValue),
          updatedAt: serverTimestamp(),
        });
        await loadContracts();
        showSuccess('Contract updated successfully!');
      } else {
        // New contract - create with full amount as balance
        const docRef = await addDoc(collection(db, 'contracts'), {
          ...payload,
          createdAt: serverTimestamp(),
        });

        // Create initial transaction
        await addDoc(collection(db, 'contract_transactions'), {
          contractId: docRef.id,
          requisitionId: null,
          risNumber: null,
          transactionType: 'INITIAL' as ContractTransactionType,
          amount: totalAmount,
          liters: null,
          pricePerLiter: null,
          balanceBefore: 0,
          balanceAfter: totalAmount,
          remarks: 'Initial contract amount',
          createdBy: user.id,
          createdByName: user.displayName,
          organizationId: user.organizationId,
          createdAt: serverTimestamp(),
        });

        await loadContracts();
        showSuccess('Contract added successfully!');
      }

      reset({
        contractNumber: '',
        supplierId: '',
        totalAmount: '',
        startDate: '',
      });
      setIsFormOpen(false);
      setEditingContract(null);
    } catch (err) {
      console.error(err);
      showError('Failed to save contract.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    reset({
      contractNumber: contract.contractNumber,
      supplierId: contract.supplierId,
      totalAmount: contract.totalAmount.toString(),
      startDate: contract.startDate ? contract.startDate.toISOString().split('T')[0] : '',
    });
    setIsFormOpen(true);
    setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('input[name="contractNumber"]');
      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInput.focus();
      }
    }, 100);
  };

  const handleDelete = (id: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete Contract',
      description: 'Are you sure you want to delete this contract? This action cannot be undone.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDoc(doc(db, 'contracts', id));
          await loadContracts();
          showSuccess('Contract deleted successfully!');
        } catch (err) {
          console.error(err);
          showError('Failed to delete contract.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleViewTransactions = async (contract: Contract) => {
    setSelectedContract(contract);
    await loadTransactions(contract.id);
    setIsTransactionModalOpen(true);
  };

  const handleAdjustment = async () => {
    if (!selectedContract || !adjustmentAmount || !adjustmentRemarks) {
      showError('Please provide both amount and remarks for adjustment.');
      return;
    }

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      showError('Please enter a valid non-zero amount.');
      return;
    }

    try {
      setIsLoading(true);
      const newBalance = selectedContract.remainingBalance + amount;

      if (newBalance < 0) {
        showError('Adjustment would result in negative balance.');
        return;
      }

      // Update contract balance
      await updateDoc(doc(db, 'contracts', selectedContract.id), {
        remainingBalance: newBalance,
        status: newBalance === 0 ? 'EXHAUSTED' : 'ACTIVE',
        exhaustedAt: newBalance === 0 ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });

      // Create transaction record
      await addDoc(collection(db, 'contract_transactions'), {
        contractId: selectedContract.id,
        requisitionId: null,
        risNumber: null,
        transactionType: 'ADJUSTMENT' as ContractTransactionType,
        amount: amount,
        liters: null,
        pricePerLiter: null,
        balanceBefore: selectedContract.remainingBalance,
        balanceAfter: newBalance,
        remarks: adjustmentRemarks,
        createdBy: user!.id,
        createdByName: user!.displayName,
        organizationId: user!.organizationId,
        createdAt: serverTimestamp(),
      });

      await loadContracts();
      await loadTransactions(selectedContract.id);
      setAdjustmentAmount('');
      setAdjustmentRemarks('');
      showSuccess('Balance adjusted successfully!');
    } catch (err) {
      console.error(err);
      showError('Failed to adjust balance.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter(
    (c) =>
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

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

      {/* Transaction History Modal */}
      <Modal
        open={isTransactionModalOpen}
        title={`Transaction History: ${selectedContract?.contractNumber}`}
        description={selectedContract ? `Supplier: ${selectedContract.supplierName}` : ''}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setSelectedContract(null);
          setTransactions([]);
          setAdjustmentAmount('');
          setAdjustmentRemarks('');
        }}
      >
        <div className="space-y-4">
          {/* Balance Summary */}
          {selectedContract && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedContract.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining Balance</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedContract.remainingBalance)}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{
                      width: `${(selectedContract.remainingBalance / selectedContract.totalAmount) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {((selectedContract.remainingBalance / selectedContract.totalAmount) * 100).toFixed(1)}% remaining
                </p>
              </div>
            </div>
          )}

          {/* Manual Adjustment */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Manual Balance Adjustment
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (positive to add, negative to deduct)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="e.g., 5000.00 or -5000.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={adjustmentRemarks}
                  onChange={(e) => setAdjustmentRemarks(e.target.value)}
                  placeholder="Reason for adjustment..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={handleAdjustment}
                disabled={isLoading || !adjustmentAmount || !adjustmentRemarks}
                className="w-full"
              >
                Apply Adjustment
              </Button>
            </div>
          </div>

          {/* Transaction List */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <History className="h-4 w-4" />
              Transaction History ({transactions.length})
            </h4>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                          {formatDate(txn.createdAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge
                            variant={
                              txn.transactionType === 'INITIAL'
                                ? 'default'
                                : txn.transactionType === 'DEDUCTION'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {txn.transactionType}
                          </Badge>
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${
                          txn.transactionType === 'DEDUCTION' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {txn.transactionType === 'DEDUCTION' ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(txn.balanceAfter)}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                          {txn.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <div className="space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 w-full max-w-3xl">
              <p className="uppercase text-xs font-semibold tracking-[0.15em] text-cyan-100">
                DPWH Regional Office II
              </p>
              <div className="flex flex-col gap-4">
                <div className="max-w-2xl">
                  <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                    Contract Management
                  </h1>
                  <p className="text-cyan-100 mt-3 text-base">
                    Manage fuel supply contracts with balance tracking and transaction history. Monitor contract utilization in real-time.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      setEditingContract(null);
                      if (isFormOpen) {
                        setIsFormOpen(false);
                        reset({
                          contractNumber: '',
                          supplierId: '',
                          totalAmount: '',
                        });
                      } else {
                        reset({
                          contractNumber: nextContractNumber,
                          supplierId: '',
                          totalAmount: '',
                          startDate: '',
                        });
                        setIsFormOpen(true);
                      }
                    }}
                    size="sm"
                    className="bg-white text-cyan-700 hover:bg-cyan-50"
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isFormOpen ? 'Close form' : 'Add Contract'}
                  </Button>
                </div>
              </div>
              <p className="text-cyan-100 text-sm">
                Track contract balances and transaction history for all fuel supply agreements.
              </p>
            </div>
            <div className="bg-white/20 border-2 border-white/40 rounded-2xl p-6 w-full max-w-sm backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-white">Contracts</span>
                <Badge className="bg-cyan-500/30 text-white border-cyan-300/50 shadow-lg">Live</Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-cyan-50 uppercase tracking-wide">Active contracts</p>
                    <p className="text-3xl font-bold text-white mt-1">{contracts.filter((c) => c.status === 'ACTIVE').length}</p>
                  </div>
                  <div className="bg-cyan-400/20 p-3 rounded-xl">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs font-medium text-cyan-50 uppercase tracking-wide">Total contracts</p>
                    <p className="text-3xl font-bold text-white mt-1">{contracts.length}</p>
                  </div>
                  <div className="bg-cyan-400/20 p-3 rounded-xl">
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
            <Card key={item.label} className="border-0 shadow-lg shadow-cyan-50/70">
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
          <Card className="shadow-xl border-0" id="contract-form">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
              <CardTitle className="text-xl">
                {editingContract ? 'Edit Contract' : 'Add New Contract'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Number"
                    placeholder="e.g., 25GB002"
                    error={errors.contractNumber?.message}
                    required
                    toUppercase
                    {...register('contractNumber', {
                      onBlur: (e) => {
                        const formatted = formatContractNumber(e.target.value);
                        setValue('contractNumber', formatted, { shouldDirty: true, shouldTouch: true });
                      },
                    })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('supplierId')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {errors.supplierId && (
                      <p className="mt-1 text-sm text-red-600">{errors.supplierId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    inputMode="decimal"
                    label="Total Amount (PHP)"
                    placeholder="e.g., 500000.00"
                    error={errors.totalAmount?.message}
                    required
                    value={watchTotalAmount}
                    {...register('totalAmount', {
                      onChange: (e) => {
                        const formatted = formatAmount(e.target.value);
                        setValue('totalAmount', formatted, { shouldDirty: true, shouldTouch: true });
                      },
                    })}
                  />
                  <Input
                    type="date"
                    label="Start Date (optional)"
                    error={errors.startDate?.message}
                    {...register('startDate')}
                  />
                </div>

                {editingContract && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">Note about editing</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Editing a contract will update its details but preserve the current balance (₱{formatCurrency(editingContract.remainingBalance)}).
                          Use manual adjustments in the transaction history to modify the balance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingContract(null);
                      reset({
                        contractNumber: '',
                        supplierId: '',
                        totalAmount: '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                    {editingContract ? 'Update Contract' : 'Add Contract'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search & List */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-xl">Contracts ({filteredContracts.length})</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                      Contract No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
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
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contract.contractNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {contract.supplierName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(contract.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div>
                          <p className="text-sm font-semibold text-blue-700">
                            {formatCurrency(contract.remainingBalance)}
                          </p>
                          <div className="bg-gray-200 rounded-full h-1 w-20 mt-1 overflow-hidden ml-auto">
                            <div
                              className="bg-blue-600 h-full"
                              style={{
                                width: `${(contract.remainingBalance / contract.totalAmount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={contract.status === 'ACTIVE' ? 'success' : 'default'}>
                          {contract.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewTransactions(contract)}
                            className="text-cyan-600 hover:text-cyan-900 transition-colors"
                            title="View Transactions"
                            disabled={isLoading}
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(contract)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            disabled={isLoading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contract.id)}
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
              {filteredContracts.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No contracts found</p>
                </div>
              )}
            </div>

            {/* Mobile view */}
            <div className="lg:hidden space-y-3 p-4">
              {filteredContracts.map((contract) => (
                <div key={contract.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Contract No.</p>
                      <p className="font-semibold text-gray-900">{contract.contractNumber}</p>
                    </div>
                    <Badge variant={contract.status === 'ACTIVE' ? 'success' : 'default'}>
                      {contract.status}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-2">
                    <div>
                      <p className="text-gray-500">Supplier</p>
                      <p className="text-gray-800">{contract.supplierName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-gray-500">Total Amount</p>
                        <p className="text-gray-900 font-medium">{formatCurrency(contract.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Balance</p>
                        <p className="text-blue-700 font-semibold">{formatCurrency(contract.remainingBalance)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500">Start Date</p>
                      <p className="text-gray-800">{formatDate(contract.startDate)}</p>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full"
                        style={{
                          width: `${(contract.remainingBalance / contract.totalAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end mt-4 pt-3 border-t">
                    <button
                      onClick={() => handleViewTransactions(contract)}
                      className="text-cyan-600 hover:text-cyan-800 text-sm font-semibold flex items-center gap-1"
                      disabled={isLoading}
                    >
                      <History className="h-4 w-4" />
                      History
                    </button>
                    <button
                      onClick={() => handleEdit(contract)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredContracts.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-6">No contracts found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
