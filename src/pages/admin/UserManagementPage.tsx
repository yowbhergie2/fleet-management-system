import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Users, Edit, Trash2, AlertCircle, CheckCircle, Shield, Edit2 } from 'lucide-react';
import { Button, Input, Select, Textarea, Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui';
import { collection, query, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/stores/authStore';
import type { UserRole } from '@/types';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .refine(
      (val) => val === '' || val.length >= 6,
      { message: 'Password must be at least 6 characters if provided' }
    )
    .optional(),
  displayName: z.string().min(2, 'Display name is required'),
  role: z.enum(['driver', 'spms', 'admin', 'emd']),
  divisionOffice: z.string().optional(),
  licenseNumber: z.string().optional(),
  position: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const roleOptions = [
  { value: 'driver', label: 'Driver' },
  { value: 'spms', label: 'SPMS Staff' },
  { value: 'admin', label: 'Administrator' },
  { value: 'emd', label: 'EMD Staff (Fuel Module)' },
];

interface UserManagementPageProps {
  onCreateUser: (userData: UserFormData) => Promise<void>;
}

type RegisteredUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  position?: string;
  divisionOffice?: string;
  licenseNumber?: string;
  phoneNumber?: string;
  organizationId?: string;
  isActive?: boolean;
};

type ModalType =
  | { type: 'none' }
  | { type: 'toggle-status'; userId: string; userName: string; currentStatus: boolean }
  | { type: 'delete'; userId: string; userName: string };

export function UserManagementPage({ onCreateUser }: UserManagementPageProps) {
  const currentUser = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [modal, setModal] = useState<ModalType>({ type: 'none' });

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      role: 'driver',
      divisionOffice: '',
      licenseNumber: '',
      position: '',
      phoneNumber: '',
    },
  });

  const selectedRole = watch('role');

  const loadUsers = async () => {
    if (!currentUser?.organizationId) return;
    setIsLoadingUsers(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map((d) => ({ ...(d.data() as RegisteredUser), id: d.id }));
      // Filter by organization
      const orgUsers = allUsers.filter((u) => u.organizationId === currentUser.organizationId);
      // Sort by displayName
      orgUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(orgUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.organizationId]);

  const onSubmit = async (data: UserFormData) => {
    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);

      if (editingUser) {
        // Check for duplicate email if email was changed
        if (data.email !== editingUser.email) {
          const duplicateEmail = users.find(
            (u) => u.email.toLowerCase() === data.email.toLowerCase() && u.id !== editingUser.id
          );
          if (duplicateEmail) {
            setError(`Email "${data.email}" is already in use by another user.`);
            return;
          }
        }

        // Update existing user
        const updatePayload: any = {
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          divisionOffice: data.divisionOffice || null,
          licenseNumber: data.licenseNumber || null,
          position: data.position || null,
          phoneNumber: data.phoneNumber || null,
        };

        // If password is provided, update it
        if (data.password && data.password.trim() !== '') {
          updatePayload.tempPassword = data.password;
          updatePayload.passwordResetRequired = true;
        }

        await updateDoc(doc(db, 'users', editingUser.id), updatePayload);
        setSuccess(
          data.password && data.password.trim() !== ''
            ? `User ${data.displayName} updated successfully! Password has been reset.`
            : `User ${data.displayName} updated successfully!`
        );
        setEditingUser(null);
      } else {
        // Create new user
        await onCreateUser(data);
        setSuccess(`User ${data.displayName} created successfully!`);
      }

      reset({
        email: '',
        password: '',
        displayName: '',
        role: 'driver',
        divisionOffice: '',
        licenseNumber: '',
        position: '',
        phoneNumber: '',
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: RegisteredUser) => {
    setEditingUser(user);
    reset({
      email: user.email,
      password: '', // Empty - admin can optionally set new password
      displayName: user.displayName,
      role: user.role,
      divisionOffice: user.divisionOffice || '',
      licenseNumber: user.licenseNumber || '',
      position: user.position || '',
      phoneNumber: user.phoneNumber || '',
    });
    setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('input[name="displayName"]');
      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInput.focus();
      }
    }, 100);
  };

  const handleToggleStatus = async () => {
    if (modal.type !== 'toggle-status') return;

    const { userId, userName, currentStatus } = modal;
    const newStatus = !currentStatus;

    try {
      setIsLoadingUsers(true);
      await updateDoc(doc(db, 'users', userId), { isActive: newStatus });
      await loadUsers();
      setSuccess(`User "${userName}" ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      setModal({ type: 'none' });
    } catch (err) {
      console.error('Failed to update user status:', err);
      setError('Failed to update user status. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async () => {
    if (modal.type !== 'delete') return;

    const { userId, userName } = modal;

    try {
      setIsLoadingUsers(true);
      setError(''); // Clear any previous errors
      console.log('Attempting to delete user:', userId, userName);
      await deleteDoc(doc(db, 'users', userId));
      console.log('User deleted from Firestore');
      await loadUsers();
      setSuccess(`User "${userName}" deleted successfully!`);
      setModal({ type: 'none' });
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };


  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { variant: 'default' as const, label: 'Admin' },
      driver: { variant: 'info' as const, label: 'Driver' },
      spms: { variant: 'warning' as const, label: 'SPMS' },
      emd: { variant: 'success' as const, label: 'EMD' },
    };
    return roleConfig[role] || { variant: 'default' as const, label: role };
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-blue-100">Create and manage system users with role-based access</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create User Form */}
        <Card className="shadow-xl border-0 lg:col-span-1">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                {editingUser ? <Edit2 className="h-5 w-5 text-white" /> : <UserPlus className="h-5 w-5 text-white" />}
              </div>
              {editingUser ? 'Edit User' : 'Create New User'}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">{editingUser ? 'Update user information' : 'Register a new system user'}</p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-green-900 font-semibold">Success!</p>
                    <p className="text-sm text-green-700 mt-1">{success}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 font-semibold">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-100">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Basic Information</h3>
                </div>

                <Controller
                  name="displayName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Full Name"
                      placeholder="e.g., Juan Dela Cruz"
                      error={errors.displayName?.message}
                      required
                      toUppercase
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="email"
                      label="Email Address"
                      placeholder="e.g., juan.delacruz@dtt-ris.gov.ph"
                      error={errors.email?.message}
                      required
                      autoComplete="off"
                      helperText={editingUser ? 'Changing email will update login credentials' : undefined}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="password"
                      label={editingUser ? 'New Password (Optional)' : 'Initial Password'}
                      placeholder={editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                      error={errors.password?.message}
                      helperText={
                        editingUser
                          ? 'Enter a new password only if you want to reset it'
                          : 'User should change this after first login'
                      }
                      required={!editingUser}
                      autoComplete="new-password"
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="User Role"
                      options={roleOptions}
                      error={errors.role?.message}
                      required
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Additional Information */}
              <div className="space-y-5 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-100">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Additional Information</h3>
                </div>

                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      label="Position/Designation"
                      placeholder="e.g., Government Driver I"
                      error={errors.position?.message}
                      rows={4}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                {(selectedRole === 'driver' || selectedRole === 'spms') && (
                  <Controller
                    name="divisionOffice"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Division/Office"
                        placeholder="e.g., Administrative Division"
                        error={errors.divisionOffice?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                )}

                {selectedRole === 'driver' && (
                  <Controller
                    name="licenseNumber"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Driver's License Number"
                        placeholder="e.g., N01-12-345678"
                        error={errors.licenseNumber?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                )}

                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Phone Number"
                      placeholder="e.g., +63 917 123 4567"
                      error={errors.phoneNumber?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t-2 border-gray-100 flex gap-3">
                {editingUser && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingUser(null);
                      reset({
                        email: '',
                        password: '',
                        displayName: '',
                        role: 'driver',
                        divisionOffice: '',
                        licenseNumber: '',
                        position: '',
                        phoneNumber: '',
                      });
                    }}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className={`${editingUser ? 'flex-1' : 'w-full'} h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow`}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {editingUser ? <Edit2 className="h-5 w-5 mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
                  {isSubmitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update User' : 'Create User')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* User List */}
        <Card className="shadow-xl border-0 lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              Registered Users ({users.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">View and manage existing users</p>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingUsers ? (
              <div className="text-center py-16 text-gray-500">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Users className="h-10 w-10 text-indigo-600" />
                </div>
                <p className="text-base font-medium text-gray-700">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10 text-indigo-600" />
                </div>
                <p className="text-base font-medium text-gray-700">No users yet</p>
                <p className="text-sm text-gray-500 mt-2">Create your first user to get started</p>
              </div>
            ) : (
              <>
                {/* Table for large screens */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {users.map((user) => {
                        const roleBadge = getRoleBadge(user.role);
                        const isActive = user.isActive !== false;
                        return (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-900">{user.displayName}</div>
                              {user.phoneNumber && (
                                <div className="text-xs text-gray-500">{user.phoneNumber}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setModal({ type: 'toggle-status', userId: user.id, userName: user.displayName, currentStatus: isActive })}
                                disabled={isLoadingUsers}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                  isActive ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                title={isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isActive ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  disabled={isLoadingUsers}
                                  title="Edit user"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setModal({ type: 'delete', userId: user.id, userName: user.displayName })}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  disabled={isLoadingUsers}
                                  title="Delete user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cards for small screens */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {users.map((user) => {
                    const roleBadge = getRoleBadge(user.role);
                    const isActive = user.isActive !== false;
                    return (
                      <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold text-gray-900 truncate">
                                {user.displayName}
                              </h3>
                              <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-2">{user.email}</p>
                          </div>
                          <button
                            onClick={() => setModal({ type: 'toggle-status', userId: user.id, userName: user.displayName, currentStatus: isActive })}
                            disabled={isLoadingUsers}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              isActive ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            title={isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {user.position && (
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Position:</span> {user.position}
                          </p>
                        )}
                        {user.divisionOffice && (
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Office:</span> {user.divisionOffice}
                          </p>
                        )}
                        {user.licenseNumber && (
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">License:</span> {user.licenseNumber}
                          </p>
                        )}
                        {user.phoneNumber && (
                          <p className="text-xs text-gray-500 mb-3">
                            <span className="font-medium">Phone:</span> {user.phoneNumber}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                            disabled={isLoadingUsers}
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => setModal({ type: 'delete', userId: user.id, userName: user.displayName })}
                            className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                            disabled={isLoadingUsers}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Toggle Status Modal */}
      {modal.type === 'toggle-status' && (
        <Modal
          open={true}
          title={`${modal.currentStatus ? 'Deactivate' : 'Activate'} User`}
          description={`Are you sure you want to ${modal.currentStatus ? 'deactivate' : 'activate'} user "${modal.userName}"?`}
          onClose={() => {
            setModal({ type: 'none' });
            setError('');
          }}
          actions={[
            {
              label: 'Cancel',
              variant: 'outline',
              onClick: () => {
                setModal({ type: 'none' });
                setError('');
              },
            },
            {
              label: modal.currentStatus ? 'Deactivate' : 'Activate',
              variant: 'primary',
              onClick: handleToggleStatus,
              isLoading: isLoadingUsers,
            },
          ]}
        />
      )}

      {/* Delete User Modal */}
      {modal.type === 'delete' && (
        <Modal
          open={true}
          title="Delete User"
          description={`Are you sure you want to delete user "${modal.userName}"? This action cannot be undone.`}
          onClose={() => {
            setModal({ type: 'none' });
            setError('');
          }}
          actions={[
            {
              label: 'Cancel',
              variant: 'outline',
              onClick: () => {
                setModal({ type: 'none' });
                setError('');
              },
            },
            {
              label: 'Delete',
              variant: 'destructive',
              onClick: handleDeleteUser,
              isLoading: isLoadingUsers,
            },
          ]}
        />
      )}
    </div>
  );
}
