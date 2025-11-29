import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { SetupPage } from '@/pages/SetupPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TripTicketsPage } from '@/pages/TripTicketsPage';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { MasterDataPage } from '@/pages/MasterDataPage';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import { signIn, onAuthChange } from '@/lib/auth';
import { createUser } from '@/lib/user-management';
import { auth, db } from '@/lib/firebase';

function App() {
  const { setUser, setLoading, user } = useAuthStore();
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null);

  // Check if setup is needed
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'system'));
        setSetupNeeded(!configDoc.exists() || !configDoc.data()?.setupCompleted);
      } catch (error) {
        setSetupNeeded(true);
      }
    };

    checkSetup();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  const handleSetup = async (data: any) => {
    // Create organization
    const orgId = `org_${data.organizationName.toLowerCase().replace(/\s+/g, '_')}`;

    await setDoc(doc(db, 'organizations', orgId), {
      name: data.organizationName,
      fullName: data.organizationFullName,
      type: 'government',
      address: data.organizationAddress,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.adminEmail,
      data.adminPassword
    );

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: data.adminEmail,
      displayName: data.adminDisplayName,
      role: 'admin',
      organizationId: orgId,
      divisionOffice: null,
      licenseNumber: null,
      position: data.adminPosition || null,
      phoneNumber: data.adminPhoneNumber || null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
    });

    // Mark setup as completed
    await setDoc(doc(db, 'config', 'system'), {
      setupCompleted: true,
      setupAt: serverTimestamp(),
      setupBy: userCredential.user.uid,
      organizationId: orgId,
    });

    setSetupNeeded(false);
  };

  const handleLogin = async (email: string, password: string) => {
    const user = await signIn(email, password);
    setUser(user);
  };

  const handleCreateUser = async (userData: any) => {
    if (!user) throw new Error('Not authenticated');
    await createUser(userData, user.organizationId);
  };

  // Show loading while checking setup
  if (setupNeeded === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading system...</p>
        </div>
      </div>
    );
  }

  // Show setup page if needed
  if (setupNeeded) {
    return <SetupPage onSetup={handleSetup} />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip-tickets"
        element={
          <ProtectedRoute allowedRoles={['admin', 'driver', 'spms']}>
            <TripTicketsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <VehiclesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master-data"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MasterDataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <UserManagementPage onCreateUser={handleCreateUser} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Fuel Requisition Module Routes - To be implemented */}
      <Route
        path="/fuel-requisitions"
        element={
          <ProtectedRoute allowedRoles={['admin', 'driver', 'spms', 'emd']}>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Fuel Requisitions</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Suppliers</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts"
        element={
          <ProtectedRoute allowedRoles={['admin', 'spms']}>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Contracts</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fuel-prices"
        element={
          <ProtectedRoute allowedRoles={['admin', 'spms']}>
            <DashboardLayout>
              <div className="p-8">
                <h1 className="text-2xl font-bold">Fuel Prices</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
