import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Database,
  Building2,
  UserCheck,
  ShieldCheck,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
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
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, Textarea, Modal } from '@/components/ui';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';

const officeSchema = z.object({
  name: z.string().min(1, 'Office name is required'),
  code: z.string().min(1, 'Office code is required'),
  signatoryId: z.string().min(1, 'Signatory is required'),
});

const signatorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
});

const authoritySchema = z.object({
  officerId: z.string().min(1, 'Officer is required'),
  prefix: z.string().optional(),
});

type OfficeFormData = z.infer<typeof officeSchema>;
type SignatoryFormData = z.infer<typeof signatorySchema>;
type AuthorityFormData = z.infer<typeof authoritySchema>;

type Office = OfficeFormData & { id: string; organizationId?: string };
type Signatory = SignatoryFormData & { id: string; organizationId?: string };
type ApprovingAuthority = AuthorityFormData & { id: string; organizationId?: string };

const prefixOptions = [
  { value: '', label: 'None' },
  { value: 'By Authority of the Regional Director:', label: 'By Authority of the Regional Director:' },
  { value: 'By Authority of the OIC-Regional Director:', label: 'By Authority of the OIC-Regional Director:' },
];

export function MasterDataPage() {
  const user = useUser();
  const [activeTab, setActiveTab] = useState<'signatories' | 'offices' | 'authorities' | 'issuance'>('signatories');
  const [offices, setOffices] = useState<Office[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [authorities, setAuthorities] = useState<ApprovingAuthority[]>([]);
  const [issuanceSignatoryId, setIssuanceSignatoryId] = useState<string>('');
  const [orgSettingsId, setOrgSettingsId] = useState<string | null>(null);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [editingSignatory, setEditingSignatory] = useState<Signatory | null>(null);
  const [editingAuthority, setEditingAuthority] = useState<ApprovingAuthority | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{
    type: 'success' | 'error' | 'confirm';
    title: string;
    description: string;
    onConfirm?: () => Promise<void> | void;
  } | null>(null);

  const showError = (description: string, title = 'Error') =>
    setModal({ type: 'error', title, description });

  const {
    register: registerOffice,
    handleSubmit: handleOfficeSubmit,
    reset: resetOffice,
    control: controlOffice,
    setValue: setOfficeValue,
    formState: { errors: officeErrors },
  } = useForm<OfficeFormData>({
    resolver: zodResolver(officeSchema),
    defaultValues: {
      name: '',
      code: '',
      signatoryId: '',
    },
  });

  const {
    register: registerSignatory,
    handleSubmit: handleSignatorySubmit,
    reset: resetSignatory,
    formState: { errors: signatoryErrors },
  } = useForm<SignatoryFormData>({
    resolver: zodResolver(signatorySchema),
  });

  const {
    register: registerAuthority,
    handleSubmit: handleAuthoritySubmit,
    reset: resetAuthority,
    formState: { errors: authorityErrors },
  } = useForm<AuthorityFormData>({
    resolver: zodResolver(authoritySchema),
    defaultValues: { prefix: '' },
  });

  const signatoryMap = useMemo(() => new Map(signatories.map((s) => [s.id, s.name])), [signatories]);

  const loadOffices = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'offices'), where('organizationId', '==', user.organizationId));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ ...(d.data() as Office), id: d.id }));
      // Sort by name alphabetically
      data.sort((a, b) => a.name.localeCompare(b.name));
      setOffices(data);
    } catch (err) {
      console.error(err);
      showError('Failed to load offices. Please check Firestore permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSignatories = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'signatories'), where('organizationId', '==', user.organizationId));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ ...(d.data() as Signatory), id: d.id }));
      // Sort by name alphabetically
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSignatories(data);
    } catch (err) {
      console.error(err);
      showError('Failed to load signatories. Please check Firestore permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuthorities = async () => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'approving_authorities'), where('organizationId', '==', user.organizationId));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ ...(d.data() as ApprovingAuthority), id: d.id }));
      setAuthorities(data);
    } catch (err) {
      console.error(err);
      showError('Failed to load approving authorities. Please check Firestore permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizationSettings = async () => {
    if (!user?.organizationId) return;
    try {
      const q = query(collection(db, 'organization_settings'), where('organizationId', '==', user.organizationId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0];
        setOrgSettingsId(docData.id);
        setIssuanceSignatoryId(docData.data().issuanceSignatoryId || '');
      }
    } catch (err) {
      console.error(err);
      // Silently fail - this is optional configuration
    }
  };

  useEffect(() => {
    loadOffices();
    loadSignatories();
    loadAuthorities();
    loadOrganizationSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const onSubmitOffice = async (data: OfficeFormData) => {
    if (!user?.organizationId) {
      setModal({ type: 'error', title: 'Error', description: 'No organization found for this user.' });
      return;
    }
    if (!data.signatoryId) {
      setModal({ type: 'error', title: 'Validation', description: 'Signatory is required.' });
      return;
    }

    // Check for duplicate office name or code
    const duplicateName = offices.find(
      (o) => o.name.toLowerCase() === data.name.toLowerCase() && o.id !== editingOffice?.id
    );
    if (duplicateName) {
      setModal({ type: 'error', title: 'Duplicate Detected', description: `Office name "${data.name}" already exists.` });
      return;
    }

    const duplicateCode = offices.find(
      (o) => o.code.toLowerCase() === data.code.toLowerCase() && o.id !== editingOffice?.id
    );
    if (duplicateCode) {
      setModal({ type: 'error', title: 'Duplicate Detected', description: `Office code "${data.code}" already exists.` });
      return;
    }

    setIsLoading(true);
    setModal(null);
    try {
      const payload = {
        ...data,
        organizationId: user.organizationId,
        updatedAt: serverTimestamp(),
      };
      if (editingOffice) {
        await updateDoc(doc(db, 'offices', editingOffice.id), payload);
        setEditingOffice(null);
        resetOffice({ name: '', code: '', signatoryId: '' });
        setModal({ type: 'success', title: 'Saved', description: 'Office updated successfully.' });
      } else {
        await addDoc(collection(db, 'offices'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        resetOffice({ name: '', code: '', signatoryId: '' });
        setModal({ type: 'success', title: 'Saved', description: 'Office added successfully.' });
      }
      await loadOffices();
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Failed to save office.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitSignatory = async (data: SignatoryFormData) => {
    if (!user?.organizationId) {
      setModal({ type: 'error', title: 'Error', description: 'No organization found for this user.' });
      return;
    }

    // Check for duplicates (case-insensitive name comparison)
    const duplicate = signatories.find(
      (s) => s.name.toLowerCase() === data.name.toLowerCase() && s.id !== editingSignatory?.id
    );
    if (duplicate) {
      setModal({ type: 'error', title: 'Duplicate Detected', description: `Signatory "${data.name}" already exists.` });
      return;
    }

    setIsLoading(true);
    setModal(null);
    try {
      const payload = {
        ...data,
        organizationId: user.organizationId,
        updatedAt: serverTimestamp(),
      };
      if (editingSignatory) {
        await updateDoc(doc(db, 'signatories', editingSignatory.id), payload);
        setEditingSignatory(null);
      } else {
        await addDoc(collection(db, 'signatories'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await loadSignatories();
      await loadAuthorities();
      resetSignatory({ name: '', position: '' });
      setModal({ type: 'success', title: 'Saved', description: 'Signatory saved successfully.' });
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Failed to save signatory.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitAuthority = async (data: AuthorityFormData) => {
    if (!user?.organizationId) {
      setModal({ type: 'error', title: 'Error', description: 'No organization found for this user.' });
      return;
    }

    // Check for duplicate officer (same officer cannot be added twice)
    const duplicate = authorities.find(
      (a) => a.officerId === data.officerId && a.id !== editingAuthority?.id
    );
    if (duplicate) {
      const officerName = signatoryMap.get(data.officerId) || 'This officer';
      setModal({ type: 'error', title: 'Duplicate Detected', description: `${officerName} is already an approving authority.` });
      return;
    }

    setIsLoading(true);
    setModal(null);
    try {
      const payload = {
        ...data,
        organizationId: user.organizationId,
        updatedAt: serverTimestamp(),
      };
      if (editingAuthority) {
        await updateDoc(doc(db, 'approving_authorities', editingAuthority.id), payload);
        setEditingAuthority(null);
      } else {
        await addDoc(collection(db, 'approving_authorities'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await loadAuthorities();
      resetAuthority({ officerId: '', prefix: '' });
      setModal({ type: 'success', title: 'Saved', description: 'Approving authority saved successfully.' });
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Failed to save approving authority.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIssuanceSignatory = async () => {
    if (!user?.organizationId) {
      setModal({ type: 'error', title: 'Error', description: 'No organization found for this user.' });
      return;
    }

    if (!issuanceSignatoryId) {
      setModal({ type: 'error', title: 'Error', description: 'Please select a signatory.' });
      return;
    }

    setIsLoading(true);
    setModal(null);
    try {
      const payload = {
        organizationId: user.organizationId,
        issuanceSignatoryId,
        updatedAt: serverTimestamp(),
      };

      if (orgSettingsId) {
        // Update existing
        await updateDoc(doc(db, 'organization_settings', orgSettingsId), payload);
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'organization_settings'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setOrgSettingsId(docRef.id);
      }

      await loadOrganizationSettings();
      setModal({ type: 'success', title: 'Saved', description: 'Issuance signatory saved successfully.' });
    } catch (err) {
      console.error(err);
      setModal({ type: 'error', title: 'Error', description: 'Failed to save issuance signatory.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOffice = async (id: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete Office',
      description: 'Are you sure you want to delete this office?',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDoc(doc(db, 'offices', id));
          await loadOffices();
          setModal({ type: 'success', title: 'Deleted', description: 'Office deleted.' });
        } catch (err) {
          console.error(err);
          setModal({ type: 'error', title: 'Error', description: 'Failed to delete office.' });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleDeleteSignatory = async (id: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete Signatory',
      description: 'Are you sure you want to delete this signatory?',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDoc(doc(db, 'signatories', id));
          await loadSignatories();
          await loadAuthorities();
          setModal({ type: 'success', title: 'Deleted', description: 'Signatory deleted.' });
        } catch (err) {
          console.error(err);
          setModal({ type: 'error', title: 'Error', description: 'Failed to delete signatory.' });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleDeleteAuthority = async (id: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete Approving Authority',
      description: 'Are you sure you want to delete this approving authority?',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDoc(doc(db, 'approving_authorities', id));
          await loadAuthorities();
          setModal({ type: 'success', title: 'Deleted', description: 'Approving authority deleted.' });
        } catch (err) {
          console.error(err);
          setModal({ type: 'error', title: 'Error', description: 'Failed to delete approving authority.' });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
        <GlobalModal modal={modal} setModal={setModal} />
        <section className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-xl p-5 sm:p-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs uppercase tracking-wide">
              <Database className="h-4 w-4" />
              Master Data
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">Control your master data</h1>
            <p className="text-blue-100 max-w-3xl">
              Offices, signatories, and approving authorities centralized for Trip Tickets and approvals.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-blue-50">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <UserCheck className="h-4 w-4" />
                Signatories
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <Building2 className="h-4 w-4" />
                Offices
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <ShieldCheck className="h-4 w-4" />
                Approving Authorities
              </div>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 bg-white/10 border border-white/30 rounded-xl px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Syncing with Firestore...</span>
            </div>
          )}
        </section>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'signatories' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('signatories')}
              >
                Signatories
              </Button>
              <Button
                variant={activeTab === 'offices' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('offices')}
              >
                Offices
              </Button>
              <Button
                variant={activeTab === 'authorities' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('authorities')}
              >
                Approving Authorities
              </Button>
              <Button
                variant={activeTab === 'issuance' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('issuance')}
              >
                Issuance Signatory
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {activeTab === 'signatories' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-sm border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                      {editingSignatory ? 'Edit Signatory' : 'Add Signatory'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={handleSignatorySubmit(onSubmitSignatory)}>
                      <Input
                        label="Name"
                        placeholder="e.g., Maria Santos"
                        error={signatoryErrors.name?.message}
                        required
                        toUppercase
                        {...registerSignatory('name')}
                      />
                      <Textarea
                        label="Position/Designation"
                        placeholder="e.g., Division Chief"
                        error={signatoryErrors.position?.message}
                        required
                        rows={4}
                        className="resize-none"
                        disabled={isLoading}
                        {...registerSignatory('position')}
                      />
                      <div className="flex justify-end gap-3">
                        {editingSignatory && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingSignatory(null);
                              resetSignatory({ name: '', position: '' });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                          {editingSignatory ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-sm border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Signatories ({signatories.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hidden lg:block">
                      <table className="w-full min-w-[520px]">
                        <thead className="bg-gray-50 text-left text-sm text-gray-500">
                          <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Position</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {signatories.map((signatory) => (
                            <tr key={signatory.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900">{signatory.name}</td>
                              <td className="px-6 py-3 text-gray-700 whitespace-pre-line">{signatory.position}</td>
                              <td className="px-6 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingSignatory(signatory);
                                      resetSignatory({
                                        name: signatory.name,
                                        position: signatory.position,
                                      });
                                      setTimeout(() => {
                                        const firstInput = document.querySelector<HTMLInputElement>('input[name="name"]');
                                        if (firstInput) {
                                          firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          firstInput.focus();
                                        }
                                      }, 100);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    disabled={isLoading}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSignatory(signatory.id)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {signatories.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                                No signatories yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden space-y-3 p-4">
                      {signatories.map((signatory) => (
                        <div key={signatory.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="font-semibold text-gray-900">{signatory.name}</div>
                          <div className="text-sm text-gray-500 mt-2">Position</div>
                          <div className="text-gray-800 whitespace-pre-line">{signatory.position}</div>
                          <div className="flex items-center gap-3 justify-end mt-4">
                            <button
                              onClick={() => {
                                setEditingSignatory(signatory);
                                resetSignatory({
                                  name: signatory.name,
                                  position: signatory.position,
                                });
                                setTimeout(() => {
                                  const firstInput = document.querySelector<HTMLInputElement>('input[name="name"]');
                                  if (firstInput) {
                                    firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    firstInput.focus();
                                  }
                                }, 100);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                              disabled={isLoading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSignatory(signatory.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {signatories.length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-4">No signatories yet.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'offices' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-sm border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {editingOffice ? 'Edit Office' : 'Add Office'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={handleOfficeSubmit(onSubmitOffice)}>
                      <Controller
                        name="name"
                        control={controlOffice}
                        render={({ field }) => (
                          <Input
                            label="Office Name"
                            placeholder="e.g., Administrative Division"
                            error={officeErrors.name?.message}
                            required
                            toUppercase
                            disabled={isLoading}
                            {...field}
                            value={field.value ?? ''}
                            onClear={() => setOfficeValue('name', '')}
                          />
                        )}
                      />
                      <Controller
                        name="code"
                        control={controlOffice}
                        render={({ field }) => (
                          <Input
                            label="Office Code"
                            placeholder="e.g., ADMIN"
                            error={officeErrors.code?.message}
                            required
                            disabled={isLoading}
                            {...field}
                            value={field.value ?? ''}
                            onClear={() => setOfficeValue('code', '')}
                          />
                        )}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Signatory
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                          {...registerOffice('signatoryId')}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            officeErrors.signatoryId ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={isLoading}
                        >
                          <option value="">-- Select signatory --</option>
                          {signatories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {officeErrors.signatoryId && (
                          <p className="text-sm text-red-600 mt-1">{officeErrors.signatoryId.message}</p>
                        )}
                      </div>
                      <div className="flex justify-end gap-3">
                        {editingOffice && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingOffice(null);
                              resetOffice({ name: '', code: '', signatoryId: '' });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                          {editingOffice ? 'Update Office' : 'Add Office'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-sm border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Offices ({offices.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hidden lg:block">
                      <table className="w-full min-w-[520px]">
                        <thead className="bg-gray-50 text-left text-sm text-gray-500">
                          <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Signatory</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {offices.map((office) => (
                            <tr key={office.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900">{office.name}</td>
                              <td className="px-6 py-3 text-gray-700">
                                <Badge variant="info">{office.code}</Badge>
                              </td>
                              <td className="px-6 py-3 text-gray-700">
                                {office.signatoryId ? signatoryMap.get(office.signatoryId) || '-' : '-'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingOffice(office);
                                      resetOffice({
                                        name: office.name,
                                        code: office.code,
                                        signatoryId: office.signatoryId || '',
                                      });
                                      setTimeout(() => {
                                        const firstInput = document.querySelector<HTMLInputElement>('input[placeholder*="Administrative"]');
                                        if (firstInput) {
                                          firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          firstInput.focus();
                                        }
                                      }, 100);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    disabled={isLoading}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOffice(office.id)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {offices.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                                No offices yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden space-y-3 p-4">
                      {offices.map((office) => (
                        <div key={office.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="font-semibold text-gray-900">{office.name}</div>
                          <div className="text-sm text-gray-500 mt-2">Code</div>
                          <div className="text-gray-800">{office.code}</div>
                          <div className="text-sm text-gray-500 mt-2">Signatory</div>
                          <div className="text-gray-800">
                            {office.signatoryId ? signatoryMap.get(office.signatoryId) || '-' : '-'}
                          </div>
                          <div className="flex items-center gap-3 justify-end mt-4">
                            <button
                              onClick={() => {
                                setEditingOffice(office);
                                resetOffice({
                                  name: office.name,
                                  code: office.code,
                                  signatoryId: office.signatoryId || '',
                                });
                                setTimeout(() => {
                                  const firstInput = document.querySelector<HTMLInputElement>('input[placeholder*="Administrative"]');
                                  if (firstInput) {
                                    firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    firstInput.focus();
                                  }
                                }, 100);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                              disabled={isLoading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOffice(office.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {offices.length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-4">No offices yet.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'authorities' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-sm border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      {editingAuthority ? 'Edit Approving Authority' : 'Add Approving Authority'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={handleAuthoritySubmit(onSubmitAuthority)}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Officer Name</label>
                        <select
                        {...registerAuthority('officerId')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          disabled={isLoading}
                        >
                          <option value="">-- Select signatory --</option>
                          {signatories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} - {s.position}
                            </option>
                          ))}
                        </select>
                        {authorityErrors.officerId && (
                          <p className="text-sm text-red-600 mt-1">{authorityErrors.officerId.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                        <select
                          {...registerAuthority('prefix')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          disabled={isLoading}
                        >
                          {prefixOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label || 'None'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-end gap-3">
                        {editingAuthority && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingAuthority(null);
                              resetAuthority({ officerId: '', prefix: '' });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                          {editingAuthority ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </form>
                    {signatories.length === 0 && (
                      <p className="text-sm text-gray-500 mt-3">
                        Add signatories first to populate this dropdown.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-sm border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Approving Authorities ({authorities.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hidden lg:block">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-left text-sm text-gray-500">
                          <tr>
                            <th className="px-6 py-3">Officer</th>
                            <th className="px-6 py-3">Prefix</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {authorities.map((authority) => (
                            <tr key={authority.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900">
                                {signatoryMap.get(authority.officerId) || 'Unknown'}
                              </td>
                              <td className="px-6 py-3 text-gray-700 whitespace-pre-line">
                                {authority.prefix || 'None'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingAuthority(authority);
                                      resetAuthority({
                                        officerId: authority.officerId,
                                        prefix: authority.prefix || '',
                                      });
                                      setTimeout(() => {
                                        const firstSelect = document.querySelector<HTMLSelectElement>('select[name="officerId"]');
                                        if (firstSelect) {
                                          firstSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          firstSelect.focus();
                                        }
                                      }, 100);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    disabled={isLoading}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAuthority(authority.id)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {authorities.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                                No approving authorities yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden space-y-3 p-4">
                      {authorities.map((authority) => (
                        <div key={authority.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                          <div className="text-sm text-gray-500">Officer</div>
                          <div className="font-semibold text-gray-900">
                            {signatoryMap.get(authority.officerId) || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 mt-2">Prefix</div>
                          <div className="text-gray-800 whitespace-pre-line">{authority.prefix || 'None'}</div>
                          <div className="flex items-center gap-3 justify-end mt-4">
                            <button
                              onClick={() => {
                                setEditingAuthority(authority);
                                resetAuthority({
                                  officerId: authority.officerId,
                                  prefix: authority.prefix || '',
                                });
                                setTimeout(() => {
                                  const firstSelect = document.querySelector<HTMLSelectElement>('select[name="officerId"]');
                                  if (firstSelect) {
                                    firstSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    firstSelect.focus();
                                  }
                                }, 100);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                              disabled={isLoading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAuthority(authority.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {authorities.length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-4">No approving authorities yet.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Issuance Signatory Tab */}
            {activeTab === 'issuance' && (
              <div className="max-w-2xl mx-auto">
                <Card className="shadow-sm border">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Select Issuance Signatory
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      This signatory will be used for all Requisition and Issue Slip (RIS) documents. Select from your organization&apos;s existing signatories.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {signatories.length === 0 ? (
                      <div className="text-center py-8">
                        <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">No signatories available</p>
                        <p className="text-sm text-gray-500">
                          Please add signatories in the &quot;Signatories&quot; tab first.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('signatories')}
                          className="mt-4"
                        >
                          Go to Signatories
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Signatory for RIS Issuance
                          </label>
                          <select
                            value={issuanceSignatoryId}
                            onChange={(e) => setIssuanceSignatoryId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">-- Select a signatory --</option>
                            {signatories.map((sig) => (
                              <option key={sig.id} value={sig.id}>
                                {sig.name} - {sig.position}
                              </option>
                            ))}
                          </select>
                        </div>

                        {issuanceSignatoryId && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">Selected Signatory</h4>
                            {(() => {
                              const selected = signatories.find((s) => s.id === issuanceSignatoryId);
                              return selected ? (
                                <div className="text-sm text-blue-800">
                                  <p className="font-semibold">{selected.name}</p>
                                  <p>{selected.position}</p>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}

                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={handleSaveIssuanceSignatory}
                            disabled={isLoading || !issuanceSignatoryId}
                            className="px-6"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Issuance Signatory'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function GlobalModal({ modal, setModal }: { modal: any; setModal: (m: any) => void }) {
  return (
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
                variant: 'primary',
                onClick: async () => {
                  const action = modal?.onConfirm;
                  setModal(null);
                  if (action) await action();
                },
              },
            ]
          : undefined
      }
    />
  );
}
