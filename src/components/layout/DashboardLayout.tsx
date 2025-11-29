import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Keep sidebar visible when resizing up to large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainMargin = isSidebarOpen
    ? isSidebarCollapsed
      ? 'lg:ml-20'
      : 'lg:ml-72'
    : 'lg:ml-0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isOpen={isSidebarOpen}
        setIsCollapsed={setIsSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm lg:hidden z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main
        className={`
          transition-[margin] duration-300 min-h-screen flex flex-col relative
          ${mainMargin}
        `}
      >
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-r from-blue-200 via-indigo-200 to-sky-100 opacity-60 blur-3xl -z-10" />

        {/* Top Header Bar */}
        <header className="min-h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                DPWH Regional Office II
              </p>
              <h1 className="text-lg font-bold text-gray-900">
                DTT, RIS and Fuel Contract Management System
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => navigate('/vehicles')}
            >
              Fleet status
            </Button>
            <Button size="sm" onClick={() => navigate('/trip-tickets')}>
              New trip ticket
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 sm:p-6 flex-1">{children}</div>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 py-4 px-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-semibold">DTT, RIS and Fuel Contract Management System v1.0.0</p>
            <p className="text-xs mt-1">2025 DPWH Regional Office II</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
