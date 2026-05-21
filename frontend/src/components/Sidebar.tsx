import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Zap,
  TrendingUp,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/events', label: 'Events', icon: Zap },
  { to: '/behavior', label: 'Behavior', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-[260px] bg-white border-r border-gray-100/80 flex flex-col h-screen fixed left-0 top-0 z-30 shadow-sm">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-2.5">
        <div className="w-9 h-9 bg-gradient-to-r from-[#D946A8] to-[#7B2FF7] rounded-lg flex items-center justify-center shadow-sm">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-extrabold text-text-primary tracking-tight">
          Beacon
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to);

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D946A8] to-[#7B2FF7] text-white shadow-md shadow-[#7B2FF7]/20'
                      : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-white' : 'text-text-muted'
                    }`}
                  />
                  {label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile & Logout */}
      <div className="px-3 pb-4 mt-auto">
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 px-3 mb-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#D946A8]/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#D946A8] to-[#7B2FF7] flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
