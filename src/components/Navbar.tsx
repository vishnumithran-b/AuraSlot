import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  CalendarPlus,
  LayoutDashboard,
  CalendarDays,
  RotateCcw,
  Menu,
  X,
  Bell,
  Command,
  User,
  Shield,
} from 'lucide-react';
import { LiveISTClock } from './LiveISTClock';
import { useAuth } from '../context/AuthContext';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useSettings } from '../context/SettingsContext';

interface NavbarProps {
  activeTab: 'book' | 'appointments' | 'calendar' | 'admin';
  onTabChange: (tab: 'book' | 'appointments' | 'calendar' | 'admin') => void;
  upcomingCount: number;
  onResetDemoData: () => void;
  onOpenCommandPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  upcomingCount,
  onResetDemoData,
  onOpenCommandPalette,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { isAdmin, switchRole } = useAuth();
  const { activityLogs } = useAppointmentsContext();
  const { businessProfile } = useSettings();

  const recentLogs = activityLogs.slice(0, 5);

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <nav
        aria-label="Main Navigation"
        className="max-w-7xl mx-auto glass-panel px-4 sm:px-6 py-3 flex items-center justify-between transition-all"
      >
        {/* Left: Brand Logo & IST Clock */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => {
              onTabChange('book');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DC2626] via-[#F43F5E] to-[#F59E0B] p-0.5 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#FFFDF9] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#DC2626] group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#1C1917] flex items-center gap-1 font-['Outfit']">
                Aura<span className="text-gradient">Slot</span>
              </span>
              <span className="hidden lg:block text-[9px] tracking-wider uppercase text-[#78716C] font-semibold leading-none">
                {businessProfile.tagline || 'Smart appointment booking'}
              </span>
            </div>
          </div>

          {/* Live IST Clock component */}
          <div className="hidden sm:block">
            <LiveISTClock />
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-stone-900/[0.04] border border-red-900/10 text-xs font-semibold">
          <button
            onClick={() => onTabChange('book')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'book'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20 font-bold'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-red-50/70'
            }`}
          >
            <CalendarPlus className="w-3.5 h-3.5 text-rose-300" />
            <span>Book Appointment</span>
          </button>

          <button
            onClick={() => onTabChange('appointments')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'appointments'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20 font-bold'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-red-50/70'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>My Bookings</span>
            {upcomingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-[#DC2626] shadow-sm">
                {upcomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20 font-bold'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-red-50/70'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            <span>Schedule Density</span>
          </button>

          <button
            onClick={() => onTabChange('admin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20 font-bold'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-red-50/70'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin Control</span>
          </button>
        </div>

        {/* Right Tools: Role Switcher, Command Palette, Notifications */}
        <div className="flex items-center gap-2">
          {/* Quick Role Switcher */}
          <button
            onClick={() => switchRole(isAdmin ? 'customer' : 'admin')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm ${
              isAdmin
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 ring-1 ring-emerald-400/30'
                : 'bg-red-50 text-[#B91C1C] border-red-200 hover:bg-red-100 ring-1 ring-red-400/30'
            }`}
            title="Click to toggle between Customer Demo and Admin Demo"
          >
            {isAdmin ? <Shield className="w-3.5 h-3.5 text-emerald-600" /> : <User className="w-3.5 h-3.5 text-[#DC2626]" />}
            <span>{isAdmin ? 'Admin View' : 'Customer View'}</span>
          </button>

          {/* Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900/[0.04] hover:bg-red-50 text-xs text-[#78716C] hover:text-[#DC2626] border border-red-900/10 hover:border-red-300 transition-colors"
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Command className="w-3.5 h-3.5 text-[#DC2626]" />
            <kbd className="hidden md:inline font-mono text-[10px] text-[#78716C] bg-white px-1 rounded border border-stone-200">⌘K</kbd>
          </button>

          {/* In-App Notifications Center Trigger */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl bg-stone-900/[0.04] hover:bg-red-50 text-[#1C1917] relative transition-colors border border-red-900/10 hover:border-red-300"
              title="System Notifications"
            >
              <Bell className="w-4 h-4 text-[#DC2626]" />
              {activityLogs.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              )}
            </button>

            {/* Notifications Dropdown Modal */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel p-4 shadow-2xl z-50 animate-in fade-in slide-from-top-2 border border-red-900/15">
                <div className="flex items-center justify-between pb-3 border-b border-red-900/10">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-red-100 text-[#DC2626]">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-xs text-[#1C1917]">Live Notification Feed</span>
                  </div>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="p-1 rounded-md hover:bg-stone-100 text-[#78716C]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                  {recentLogs.length === 0 ? (
                    <p className="text-center py-4 text-[#78716C] text-xs">No recent activity</p>
                  ) : (
                    recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 hover:border-red-200 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              log.type === 'booking' || log.type === 'payment'
                                ? 'bg-emerald-100 text-[#047857]'
                                : log.type === 'reschedule'
                                ? 'bg-amber-100 text-amber-800'
                                : log.type === 'cancellation'
                                ? 'bg-red-100 text-[#991B1B]'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.type}
                          </span>
                          <span className="text-[10px] text-[#78716C] font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('en-US', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            IST
                          </span>
                        </div>
                        <p className="text-[#1C1917] font-semibold text-[11px] leading-tight">{log.title}</p>
                        <p className="text-[#78716C] text-[10px] leading-snug mt-0.5">{log.description}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2.5 mt-2 border-t border-red-900/10 text-center">
                  <button
                    onClick={() => {
                      onTabChange('admin');
                      setNotificationsOpen(false);
                    }}
                    className="text-[11px] text-[#DC2626] font-semibold hover:underline"
                  >
                    View Complete Audit Log in Admin →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemoData}
            title="Reset 15+ demo appointments, providers, and settings"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-[#78716C] hover:text-[#1C1917] bg-stone-900/[0.04] hover:bg-stone-900/[0.08] border border-red-900/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" />
          </button>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-stone-900/[0.04] border border-red-900/10 text-[#1C1917]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 p-4 glass-panel flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 border border-red-900/15">
          <button
            onClick={() => {
              onTabChange('book');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold ${
              activeTab === 'book'
                ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white'
                : 'text-[#78716C] bg-stone-50'
            }`}
          >
            <span>Book Appointment</span>
          </button>

          <button
            onClick={() => {
              onTabChange('appointments');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold ${
              activeTab === 'appointments'
                ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white'
                : 'text-[#78716C] bg-stone-50'
            }`}
          >
            <span>My Bookings</span>
            {upcomingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#991B1B] text-[10px] font-bold">
                {upcomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              onTabChange('calendar');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white'
                : 'text-[#78716C] bg-stone-50'
            }`}
          >
            <span>Schedule Density</span>
          </button>

          <button
            onClick={() => {
              onTabChange('admin');
              setMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white'
                : 'text-[#78716C] bg-stone-50'
            }`}
          >
            <span>Admin Control Panel</span>
          </button>

          <div className="pt-2 border-t border-red-900/10 flex items-center justify-between">
            <button
              onClick={() => {
                switchRole(isAdmin ? 'customer' : 'admin');
                setMobileMenuOpen(false);
              }}
              className="text-xs font-semibold text-[#DC2626] underline"
            >
              Toggle to {isAdmin ? 'Customer View' : 'Admin View'}
            </button>
            <button
              onClick={() => {
                onResetDemoData();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-[#78716C] underline"
            >
              Reset Demo Data
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
