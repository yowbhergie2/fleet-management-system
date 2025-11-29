import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Fuel,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { useUser } from '@/stores/authStore';
import { db } from '@/lib/firebase';
import type { FuelRequisition } from '@/types';

export function DashboardPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [fuelStats, setFuelStats] = useState({
    pending: 0,
    validated: 0,
    issued: 0,
    completed: 0,
  });
  const [recentRequests, setRecentRequests] = useState<FuelRequisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.organizationId) return;

    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Load fuel requisition stats
        const fuelQuery = query(
          collection(db, 'fuel_requisitions'),
          where('organizationId', '==', user.organizationId)
        );
        const fuelSnap = await getDocs(fuelQuery);

        const stats = {
          pending: 0,
          validated: 0,
          issued: 0,
          completed: 0,
        };

        fuelSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'PENDING_EMD' || data.status === 'RETURNED') stats.pending++;
          else if (data.status === 'EMD_VALIDATED') stats.validated++;
          else if (data.status === 'RIS_ISSUED' || data.status === 'RECEIPT_SUBMITTED') stats.issued++;
          else if (data.status === 'COMPLETED') stats.completed++;
        });

        setFuelStats(stats);

        // Load recent fuel requests
        const recentQuery = query(
          collection(db, 'fuel_requisitions'),
          where('organizationId', '==', user.organizationId),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentSnap = await getDocs(recentQuery);
        const requests = recentSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            inclusiveDateFrom: data.inclusiveDateFrom?.toDate?.() || new Date(),
            inclusiveDateTo: data.inclusiveDateTo?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          } as FuelRequisition;
        });
        setRecentRequests(requests);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.organizationId]);

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'COMPLETED') return 'success';
    if (status === 'PENDING_EMD' || status === 'RETURNED') return 'warning';
    if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
    return 'info';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING_EMD: 'Pending Validation',
      RETURNED: 'Returned',
      EMD_VALIDATED: 'Validated',
      RIS_ISSUED: 'RIS Issued',
      RECEIPT_SUBMITTED: 'Receipt Submitted',
      COMPLETED: 'Completed',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-600 to-blue-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10">
            <p className="uppercase text-xs font-semibold tracking-[0.15em] text-blue-100">
              DPWH Regional Office II
            </p>
            <div className="mt-4 max-w-2xl">
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
              </h1>
              <p className="text-blue-100 mt-3 text-base">
                Manage fuel requisitions, track RIS issuance, and monitor fleet operations from this centralized dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-blue-700 hover:bg-blue-50"
                onClick={() => navigate('/fuel-requisitions')}
              >
                <Fuel className="h-4 w-4 mr-2" />
                Create fuel request
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="border border-white/70 text-white hover:bg-white/10"
                onClick={() => navigate('/vehicles')}
              >
                <Truck className="h-4 w-4 mr-2" />
                Manage vehicles
              </Button>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg shadow-blue-50/70">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Validation</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? '...' : fuelStats.pending}</p>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-amber-100 text-amber-700">
                <FileText className="h-4 w-4 mr-1.5" />
                EMD Queue
              </span>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg shadow-blue-50/70">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Validated Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? '...' : fuelStats.validated}</p>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700">
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                SPMS Queue
              </span>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg shadow-blue-50/70">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <p className="text-sm font-medium text-gray-600">RIS Issued</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? '...' : fuelStats.issued}</p>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-indigo-100 text-indigo-700">
                <Fuel className="h-4 w-4 mr-1.5" />
                Active
              </span>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg shadow-blue-50/70">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? '...' : fuelStats.completed}</p>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Total
              </span>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Fuel Requests */}
          <Card className="border-0 shadow-lg shadow-blue-50/70 xl:col-span-2">
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Fuel className="h-5 w-5 text-blue-600" />
                Recent Fuel Requests
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/fuel-requisitions')}>
                View all
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : recentRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No fuel requests yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-left text-sm text-gray-500">
                      <tr>
                        <th className="py-3">Reference</th>
                        <th className="py-3">Driver</th>
                        <th className="py-3">Vehicle</th>
                        <th className="py-3">Liters</th>
                        <th className="py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {recentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/fuel-requisitions')}>
                          <td className="py-3 font-mono text-xs font-semibold text-gray-900">
                            FR-{String(req.refNumber || 0).padStart(6, '0')}
                          </td>
                          <td className="py-3 text-gray-800">{req.driverName}</td>
                          <td className="py-3 text-gray-700">{req.dpwhNumber}</td>
                          <td className="py-3 text-gray-600">{req.requestedLiters}L</td>
                          <td className="py-3 text-right">
                            <Badge variant={getStatusBadgeVariant(req.status)}>
                              {getStatusLabel(req.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Side Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Quick Actions</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.role === 'driver' && (
                  <Button className="w-full justify-between" variant="primary" onClick={() => navigate('/fuel-requisitions')}>
                    Create Fuel Request
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {(user?.role === 'emd' || user?.role === 'admin') && (
                  <Button className="w-full justify-between" variant="primary" onClick={() => navigate('/fuel-requisitions')}>
                    Validate Requests
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {(user?.role === 'spms' || user?.role === 'admin') && (
                  <Button className="w-full justify-between" variant="outline" onClick={() => navigate('/fuel-requisitions')}>
                    Issue RIS Numbers
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate('/vehicles')}>
                  Manage Vehicles
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {user?.role === 'admin' && (
                  <Button className="w-full justify-between" variant="secondary" onClick={() => navigate('/admin/users')}>
                    Manage Users
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* System Info */}
            <Card className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader>
                <CardTitle className="text-xl">System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Organization</span>
                  <span className="font-semibold text-gray-900">DPWH RO-II</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Your Role</span>
                  <Badge variant="info">{user?.role?.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Module Version</span>
                  <span className="font-mono text-xs text-gray-900">v2.4</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
