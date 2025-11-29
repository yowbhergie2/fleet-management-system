import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Truck,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Fuel,
  Building2,
  ScrollText,
  Gauge,
} from 'lucide-react';
import { logout } from '@/lib/auth';
import { useUser } from '@/stores/authStore';

interface SidebarProps {
  isCollapsed: boolean;
  isOpen: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onClose: () => void;
}

export function Sidebar({ isCollapsed, isOpen, setIsCollapsed, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();

  const formatRole = (role: string) => {
    const map: Record<string, string> = {
      spms: 'SPMS',
      emd: 'EMD',
      admin: 'Admin',
      driver: 'Driver',
    };
    return map[role] || role.toUpperCase();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'driver', 'spms', 'emd'] },
    { icon: FileText, label: 'Trip Tickets', path: '/trip-tickets', roles: ['admin', 'driver', 'spms'] },

    // Fuel Requisition Module
    { icon: Fuel, label: 'Fuel Requisitions', path: '/fuel-requisitions', roles: ['admin', 'driver', 'spms', 'emd'] },
    { icon: Building2, label: 'Suppliers', path: '/suppliers', roles: ['admin'] },
    { icon: ScrollText, label: 'Contracts', path: '/contracts', roles: ['admin', 'spms'] },
    { icon: Gauge, label: 'Fuel Prices', path: '/fuel-prices', roles: ['admin', 'spms'] },

    // Admin/System
    { icon: Truck, label: 'Vehicles', path: '/vehicles', roles: ['admin'] },
    { icon: Database, label: 'Master Data', path: '/master-data', roles: ['admin'] },
    { icon: Users, label: 'Users', path: '/admin/users', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <div
      className={`
        fixed left-0 top-0 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-xl
        transition-all duration-300 z-40 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-72'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo & Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm leading-none">DTT, RIS</h2>
              <p className="text-xs text-gray-600">DPWH Regional Office II</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          )}
        </button>
        {!isCollapsed && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden ml-1"
            title="Hide sidebar"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg
                transition-all duration-200 relative overflow-hidden
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'flex-shrink-0'}`} />
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-gray-200 space-y-2 flex-shrink-0">
        {/* User Info */}
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{user.displayName}</p>
              <p className="text-xs text-gray-600">{formatRole(user.role)}</p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-3 rounded-lg
            text-red-600 hover:bg-red-50 transition-colors
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
