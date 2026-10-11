import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import {
  AppointmentsProvider,
  useAppointmentsContext,
} from './context/AppointmentsContext';
import { Navbar } from './components/Navbar';
import { BookingForm } from './components/BookingForm';
import { MyAppointments } from './pages/MyAppointments';
import { CalendarDensityView } from './components/CalendarDensityView';
import { AdminDashboard } from './pages/AdminDashboard';
import { BookingSuccessModal } from './components/BookingSuccessModal';
import { CommandPalette } from './components/CommandPalette';
import { UndoToast } from './components/UndoToast';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './hooks/useToast';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  Percent,
  CalendarCheck,
} from 'lucide-react';
import type { Appointment } from './types/appointment';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<'book' | 'appointments' | 'calendar' | 'admin'>('book');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { appointments, resetToSampleData } = useAppointmentsContext();
  const { businessProfile } = useSettings();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  const upcomingCount = appointments.filter((a) => a.status === 'upcoming').length;

  const handleBookSuccess = (appointment: Appointment) => {
    setConfirmedAppointment(appointment);
  };

  const handleSelectDateFromCalendar = (dateStr: string) => {
    setActiveTab('book');
    showInfo(`Selected ${dateStr} for reservation. Adjust your details below.`);
  };

  return (
    <div className="relative min-h-screen bg-[#FAF6EE] text-[#1C1917] flex flex-col justify-between selection:bg-red-500/20 selection:text-red-950">
      {/* Background Ambient Multi-Colored Glows and Cream Gradient Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF6EE] via-[#F8EFE4] to-[#F1E4D2]" />
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-[#DC2626]/12 rounded-full blur-[140px] animate-glow-1" />
        <div className="absolute top-1/4 -right-36 w-[600px] h-[600px] bg-[#F43F5E]/12 rounded-full blur-[160px] animate-glow-2" />
        <div className="absolute top-1/2 left-10 w-[450px] h-[450px] bg-[#10B981]/10 rounded-full blur-[150px] animate-glow-1" />
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-[#F59E0B]/10 rounded-full blur-[150px] animate-glow-2" />
        <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-[#3B82F6]/08 rounded-full blur-[140px] animate-glow-1" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(rgba(185, 28, 28, 0.4) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Main App Container */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          upcomingCount={upcomingCount}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onResetDemoData={() => {
            resetToSampleData();
            showInfo('Demo data restored to initial 15+ verified appointments.');
          }}
        />

        {/* Main Body */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
          {/* TAB 1: Booking Form */}
          {activeTab === 'book' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
              {/* Left Column: Booking Form */}
              <div className="lg:col-span-8">
                <BookingForm
                  onBookSuccess={handleBookSuccess}
                  showToastError={showError}
                  showToastSuccess={showSuccess}
                />
              </div>

              {/* Right Column: Information & Key Highlights */}
              <div className="lg:col-span-4 space-y-6">
                {/* Hero Feature Box with Radiant Header */}
                <div className="glass-card p-6 border border-red-500/20 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#DC2626]/10 via-[#F43F5E]/10 to-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DC2626] mb-2">
                    <span className="p-1 rounded-lg bg-red-100/90 text-[#DC2626]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-gradient font-extrabold">IST & GST Compliant</span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1C1917] font-['Outfit'] mb-2">
                    Smart Scheduling
                  </h3>
                  <p className="text-xs text-[#78716C] leading-relaxed mb-4">
                    Book appointments in <span className="text-[#1C1917] font-semibold">Indian Standard Time (IST)</span> with itemized GST (CGST+SGST/IGST), SAC billing codes, and instant collision prevention.
                  </p>

                  <div className="space-y-3.5 pt-3 border-t border-red-900/10 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Strict IST Synchronization</span>
                        <p className="text-[11px] text-[#78716C]">
                          Asia/Kolkata timezone standard used everywhere. Past slots & countdowns computed in IST.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-[#DC2626] shrink-0">
                        <Percent className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Transparent GST Breakdown</span>
                        <p className="text-[11px] text-[#78716C]">
                          CGST (9%) + SGST (9%) for Tamil Nadu; IGST (18%) for inter-state bookings.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[#4F46E5] shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Collision & Buffer Protection</span>
                        <p className="text-[11px] text-[#78716C]">
                          Multi-provider scheduling with duration + buffer intervals blocks overlapping bookings.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-[#D97706] shrink-0">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Instant Invoicing & Pass</span>
                        <p className="text-[11px] text-[#78716C]">
                          Downloadable vector PDF tax invoice and digital QR entry pass with live countdown.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Link Card */}
                <div className="glass-panel-subtle p-5 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[#1C1917]">Need to check bookings?</h4>
                    <p className="text-xs text-[#78716C]">View invoices, passes, or reschedule.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="btn-secondary px-4 py-2 text-xs font-semibold whitespace-nowrap"
                  >
                    My Bookings ({upcomingCount})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Customer Appointments View */}
          {activeTab === 'appointments' && (
            <div className="animate-in fade-in duration-300">
              <MyAppointments
                onNavigateToBook={() => setActiveTab('book')}
                showToastSuccess={showSuccess}
                showToastError={showError}
              />
            </div>
          )}

          {/* TAB 3: Calendar Density View */}
          {activeTab === 'calendar' && (
            <div className="animate-in fade-in duration-300">
              <CalendarDensityView onSelectDateToBook={handleSelectDateFromCalendar} />
            </div>
          )}

          {/* TAB 4: Admin Control Dashboard */}
          {activeTab === 'admin' && (
            <div className="animate-in fade-in duration-300">
              <AdminDashboard />
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-red-900/10 mt-12 py-6 px-4 text-xs text-[#78716C]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1C1917] font-['Outfit']">{businessProfile.businessName}</span>
            <span>• GSTIN: {businessProfile.gstin} • Asia/Kolkata (IST)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Indian GST Rule 46 Compliant Invoicing</span>
            <span>•</span>
            <span className="text-[#059669] flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              IST Real-time Node Active
            </span>
          </div>
        </div>
      </footer>

      {/* Booking Confirmation Success Modal */}
      {confirmedAppointment && (
        <BookingSuccessModal
          appointment={confirmedAppointment}
          onClose={() => setConfirmedAppointment(null)}
          onViewAppointments={() => {
            setActiveTab('appointments');
            setConfirmedAppointment(null);
          }}
          onBookAnother={() => {
            setActiveTab('book');
            setConfirmedAppointment(null);
          }}
        />
      )}

      {/* Command Palette (Ctrl/Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={setActiveTab}
      />

      {/* 10-Second Undo Cancellation Toast */}
      <UndoToast />

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <AppointmentsProvider>
            <MainAppContent />
          </AppointmentsProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
