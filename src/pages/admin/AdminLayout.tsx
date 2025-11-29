import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/stores/authStore';
import { logout } from '@/lib/auth';
import { LogOut, User, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const user = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
              <div className="border-l pl-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Admin Panel
                </h1>
                <p className="text-sm text-gray-500">
                  DTT, RIS and Fuel Contract Management System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <div className="text-right">
                  <p className="font-medium text-gray-900">{user?.displayName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              {/* Logout Button */}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>

        {/* Page Content */}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>DTT, RIS and Fuel Contract Management System v1.0.0 - Admin Panel</p>
          <p>© 2025 DPWH Regional Office II - COA Compliant</p>
        </div>
      </footer>
    </div>
  );
}
