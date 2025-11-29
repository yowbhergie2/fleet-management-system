import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { useUser } from '@/stores/authStore';

const metricCards = [
  { label: 'Trip tickets in progress', value: '12', change: '+3 vs last week', icon: FileText, accent: 'bg-blue-100 text-blue-700' },
  { label: 'Pending approvals', value: '4', change: 'SPMS queue', icon: ShieldCheck, accent: 'bg-amber-100 text-amber-700' },
  { label: 'Active vehicles', value: '18', change: '3 under maintenance', icon: Truck, accent: 'bg-emerald-100 text-emerald-700' },
  { label: 'On-time departures', value: '92%', change: 'Last 30 days', icon: BarChart3, accent: 'bg-indigo-100 text-indigo-700' },
];

const upcomingTrips = [
  { id: 'TT-2025-011', destination: 'Tuguegarao City Hall', driver: 'Juan Dela Cruz', date: 'Today • 2:00 PM', status: 'In progress' },
  { id: 'TT-2025-012', destination: 'Ilagan District Office', driver: 'Maria Santos', date: 'Tomorrow • 8:30 AM', status: 'Queued' },
  { id: 'TT-2025-013', destination: 'Project Site - Aparri', driver: 'Rico Tan', date: 'Mar 2 • 6:00 AM', status: 'Scheduled' },
];

const fleetHighlights = [
  { title: 'Fuel-efficient picks', value: 'Hilux 2024 • ABC 1234', hint: 'Ready and fully fueled', icon: Truck },
  { title: 'Quick approval lane', value: '4 requests', hint: 'SPMS review pending', icon: ShieldCheck },
  { title: 'Routes with longest distance', value: 'Cauayan ↔ Aparri', hint: 'Plan fuel stopovers', icon: MapPin },
];

const alerts = [
  { label: 'Vehicle maintenance', detail: 'Ranger XLT (XYZ 5678) due for PMS next week', tone: 'warning' as const },
  { label: 'Document follow-up', detail: '3 drivers need to upload new licenses', tone: 'info' as const },
  { label: 'Fuel contract', detail: 'Renewal draft ready for review', tone: 'info' as const },
];

export function DashboardPage() {
  const user = useUser();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-600 to-blue-700 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative p-8 lg:p-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="uppercase text-xs font-semibold tracking-[0.15em] text-blue-100">
                DPWH Regional Office II
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold mt-2 leading-tight">
                Welcome back{user?.displayName ? `, ${user.displayName}` : ''}! Here’s your operations snapshot.
              </h1>
              <p className="text-blue-100 mt-3 text-base">
                Keep trip tickets moving, keep vehicles healthy, and keep teams aligned — all from this single view.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  variant="secondary"
                  className="bg-white text-blue-700 hover:bg-blue-50"
                  onClick={() => navigate('/trip-tickets')}
                >
                  Create trip ticket
                </Button>
                <Button variant="outline" className="border-white/60 text-white hover:bg-white/10" onClick={() => navigate('/vehicles')}>
                  Manage vehicles
                </Button>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 w-full max-w-sm backdrop-blur">
              <div className="flex items-center justify-between text-sm text-blue-50">
                <span>Approvals</span>
                <Badge className="bg-white/20 text-white border-white/30">Today</Badge>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Pending review</p>
                    <p className="text-lg font-semibold">4 trip tickets</p>
                  </div>
                  <ShieldCheck className="h-10 w-10 text-white/80" />
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <div>
                    <p className="text-sm text-blue-100">Vehicles ready</p>
                    <p className="text-lg font-semibold">18 active</p>
                  </div>
                  <Truck className="h-10 w-10 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-0 shadow-lg shadow-blue-50/70">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.accent}`}>
                    <Icon className="h-4 w-4 mr-1.5" />
                    {item.change}
                  </span>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Trip tickets table */}
          <Card className="border-0 shadow-lg shadow-blue-50/70 xl:col-span-2">
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-5 w-5 text-blue-600" />
                Trip ticket pipeline
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/trip-tickets')}>
                View all
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-left text-sm text-gray-500">
                    <tr>
                      <th className="py-3">Serial</th>
                      <th className="py-3">Destination</th>
                      <th className="py-3">Driver</th>
                      <th className="py-3">Schedule</th>
                      <th className="py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {upcomingTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50">
                        <td className="py-3 font-semibold text-gray-900">{trip.id}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 text-gray-800">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            {trip.destination}
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">{trip.driver}</td>
                        <td className="py-3 text-gray-600">{trip.date}</td>
                        <td className="py-3 text-right">
                          <Badge variant={trip.status === 'In progress' ? 'success' : trip.status === 'Queued' ? 'warning' : 'info'}>
                            {trip.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Side column */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Fleet highlights</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Quick cues for assigning vehicles</p>
                </div>
                <Badge variant="info">Live</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {fleetHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="p-4 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-white transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{item.title}</p>
                          <p className="text-base font-semibold text-gray-900">{item.value}</p>
                        </div>
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{item.hint}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Actions & alerts</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Stay ahead of blockers</p>
                </div>
                <Bell className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.detail}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        alert.tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      !
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{alert.label}</p>
                      <p className="text-sm text-gray-600">{alert.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarClock className="h-4 w-4" />
                    <span>Next milestone: Fuel contract review</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/vehicles')}>
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-blue-50/70">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Quick actions</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" variant="primary" onClick={() => navigate('/trip-tickets')}>
                  Start a new trip ticket
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate('/vehicles')}>
                  Assign a vehicle
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="secondary" onClick={() => navigate('/admin/users')}>
                  Manage users
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
