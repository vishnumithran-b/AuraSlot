import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  DollarSign,
  Calendar,
  XCircle,
  Percent,
  Download,
  Search,
  Plus,
  Trash2,
  Clock,
  Lock,
} from 'lucide-react';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useSettings } from '../context/SettingsContext';
import { formatINR } from '../utils/currency';
import {
  formatISTDisplayDate,
  formatISTTimeDisplay,
  getTodayISTDateString,
} from '../utils/date-ist';
import { downloadInvoicePDF } from '../utils/invoice';
import type {
  AppointmentStatus,
  ServiceOption,
  Coupon,
} from '../types/appointment';

export const AdminDashboard: React.FC = () => {
  const {
    appointments,
    activityLogs,
    exportToCSV,
    bulkUpdateStatus,
    bulkCancel,
  } = useAppointmentsContext();

  const {
    services,
    providers,
    holidays,
    coupons,
    blockedDates,
    businessConfig,
    addService,
    deleteService,
    addCoupon,
    toggleCoupon,
    deleteCoupon,
    removeHoliday,
    toggleBlockDate,
  } = useSettings();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'analytics' | 'appointments' | 'services' | 'providers' | 'coupons' | 'holidays' | 'audit'
  >('analytics');

  // Search & Filters for Appointments Table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // New Service Modal / Form State
  const [newService, setNewService] = useState<Partial<ServiceOption>>({
    name: '',
    category: 'Specialist Care',
    duration: 30,
    basePrice: 1000,
    gstRate: 18,
    sacCode: '998311',
    description: '',
  });
  const [showAddService, setShowAddService] = useState(false);

  // New Coupon Form State
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 10,
    minAmount: 500,
    description: '',
    expiryDate: '2026-12-31',
    isActive: true,
  });
  const [showAddCoupon, setShowAddCoupon] = useState(false);

  const todayIST = getTodayISTDateString();

  // 1. High-Level Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const a of appointments) {
      if (a.date === todayIST && a.status !== 'cancelled') {
        todayCount++;
      }
      if (a.status === 'upcoming') upcomingCount++;
      if (a.status === 'completed') completedCount++;
      if (a.status === 'cancelled') cancelledCount++;

      if (a.paymentStatus === 'paid') {
        totalRevenue += a.pricing.taxableAmount;
        totalTaxCollected += a.pricing.isInterState
          ? a.pricing.igst
          : a.pricing.cgst + a.pricing.sgst;
      }
    }

    const cancellationRate =
      appointments.length > 0
        ? Math.round((cancelledCount / appointments.length) * 100)
        : 0;

    return {
      todayCount,
      upcomingCount,
      completedCount,
      cancelledCount,
      totalRevenue,
      totalTaxCollected,
      cancellationRate,
    };
  }, [appointments, todayIST]);

  // 2. Chart Data: Bookings per Day (last 7 days / future 7 days)
  const bookingsPerDayData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status !== 'cancelled') {
        map[a.date] = (map[a.date] || 0) + 1;
      }
    }
    const dates = Object.keys(map).sort();
    return dates.map((d) => ({
      date: d.slice(5), // MM-DD
      fullDate: d,
      bookings: map[d],
    }));
  }, [appointments]);

  // 3. Chart Data: Revenue by Service
  const revenueByServiceData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      if (a.paymentStatus === 'paid') {
        map[a.serviceName] = (map[a.serviceName] || 0) + a.pricing.taxableAmount;
      }
    }
    return Object.entries(map).map(([name, revenue]) => ({
      name: name.length > 18 ? name.slice(0, 16) + '...' : name,
      revenue,
    }));
  }, [appointments]);

  // 4. Chart Data: Peak Hours
  const peakHoursData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      const slot = a.timeSlot;
      map[slot] = (map[slot] || 0) + 1;
    }
    const slots = Object.keys(map).sort();
    return slots.map((s) => ({
      slot: s,
      appointments: map[s],
    }));
  }, [appointments]);

  // 5. Chart Data: Status Pie
  const statusPieData = useMemo(() => {
    return [
      { name: 'Upcoming', value: stats.upcomingCount, color: '#DC2626' },
      { name: 'Completed', value: stats.completedCount, color: '#059669' },
      { name: 'Cancelled', value: stats.cancelledCount, color: '#78716C' },
    ];
  }, [stats]);

  // 6. Filtered Appointments for Table
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchSearch =
        !searchTerm.trim() ||
        a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone.includes(searchTerm);

      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchProvider = providerFilter === 'all' || a.providerId === providerFilter;
      const matchService = serviceFilter === 'all' || a.serviceId === serviceFilter;

      return matchSearch && matchStatus && matchProvider && matchService;
    });
  }, [appointments, searchTerm, statusFilter, providerFilter, serviceFilter]);

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, currentPage]);

  const totalPages = Math.ceil(filteredAppointments.length / pageSize) || 1;

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedAppointments.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-red-900/15">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DC2626] mb-1">
            <Lock className="w-4 h-4 text-[#059669]" />
            <span>Administrator Control Center • GSTIN: {businessConfig.gstin}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] font-['Outfit']">
            Operations & Financial Analytics
          </h1>
          <p className="text-xs text-[#78716C] mt-0.5">
            Monitored strictly in Indian Standard Time (IST, UTC+5:30) • {appointments.length} Total Registered Records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV()}
            className="btn-secondary px-4 py-2.5 text-xs font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#059669]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Appointments */}
        <div className="glass-card p-5 border border-red-500/20 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-3 font-semibold">
            <span>Today's Visits (IST)</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#F43F5E] text-white flex items-center justify-center shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-['Outfit'] text-[#1C1917]">{stats.todayCount}</p>
          <p className="text-[10px] text-[#059669] mt-1 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Real-time scheduled visits
          </p>
        </div>

        {/* Upcoming */}
        <div className="glass-card p-5 border border-sky-500/20 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-3 font-semibold">
            <span>Upcoming Active</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#38BDF8] text-white flex items-center justify-center shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-['Outfit'] text-[#1C1917]">{stats.upcomingCount}</p>
          <p className="text-[10px] text-[#0284C7] mt-1 font-semibold">{stats.completedCount} completed to date</p>
        </div>

        {/* Total Revenue */}
        <div className="glass-card p-5 border border-emerald-500/20 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-3 font-semibold">
            <span>Total Base Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#059669] to-[#34D399] text-white flex items-center justify-center shadow-sm">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-['Outfit'] text-[#1C1917] font-mono">
            {formatINR(stats.totalRevenue)}
          </p>
          <p className="text-[10px] text-[#059669] mt-1 font-semibold">Taxable service turnover</p>
        </div>

        {/* GST Collected */}
        <div className="glass-card p-5 border border-amber-500/20 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-3 font-semibold">
            <span>GST Collected</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D97706] to-[#FBBF24] text-white flex items-center justify-center shadow-sm">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-['Outfit'] text-[#D97706] font-mono">
            {formatINR(stats.totalTaxCollected)}
          </p>
          <p className="text-[10px] text-amber-700 mt-1 font-bold">CGST + SGST + IGST liability</p>
        </div>

        {/* Cancellation Rate */}
        <div className="glass-card p-5 border border-rose-500/20 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-3 font-semibold">
            <span>Cancellation Rate</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#FB7185] text-white flex items-center justify-center shadow-sm">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-['Outfit'] text-[#1C1917]">
            {stats.cancellationRate}%
          </p>
          <p className="text-[10px] text-rose-700 mt-1 font-medium">
            {stats.cancelledCount} cancelled with IST refund
          </p>
        </div>
      </div>

      {/* Admin Subtabs Navigation */}
      <div className="flex items-center gap-2 border-b border-red-900/10 overflow-x-auto pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveAdminTab('analytics')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'analytics'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Visual Analytics (Recharts)
        </button>

        <button
          onClick={() => setActiveAdminTab('appointments')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'appointments'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Appointments Management ({appointments.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('services')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'services'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Services & Prices ({services.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('providers')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'providers'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Staff Providers ({providers.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('coupons')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'coupons'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Coupon Offers ({coupons.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('holidays')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'holidays'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Holidays & Blocked Dates ({holidays.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('audit')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${
            activeAdminTab === 'audit'
              ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-md shadow-red-900/20'
              : 'text-[#78716C] hover:bg-red-50/70 hover:text-[#1C1917]'
          }`}
        >
          Activity & Audit Log ({activityLogs.length})
        </button>
      </div>

      {/* VIEW 1: RECHARTS VISUAL ANALYTICS */}
      {activeAdminTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {/* Chart 1: Bookings per Day */}
          <div className="glass-panel p-6 border border-red-900/15 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C1917] font-['Outfit']">
                Bookings per Day (IST)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#991B1B]">
                Daily Frequency
              </span>
            </div>
            <p className="text-xs text-[#78716C] mb-4">Daily consultation load distribution</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingsPerDayData}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.85} />
                      <stop offset="60%" stopColor="#F43F5E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FB923C" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,38,38,0.12)" />
                  <XAxis dataKey="date" stroke="#78716C" fontSize={10} />
                  <YAxis stroke="#78716C" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: 'rgba(220,38,38,0.3)',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: '#1C1917',
                      boxShadow: '0 8px 24px rgba(220,38,38,0.15)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke="#DC2626"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorBookings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Revenue by Service */}
          <div className="glass-panel p-6 border border-red-900/15 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C1917] font-['Outfit']">
                Revenue by Service (₹ INR)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#047857]">
                Gross Turnover
              </span>
            </div>
            <p className="text-xs text-[#78716C] mb-4">Total gross revenue across clinical offerings</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByServiceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,38,38,0.12)" />
                  <XAxis dataKey="name" stroke="#78716C" fontSize={10} />
                  <YAxis stroke="#78716C" fontSize={10} />
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: 'rgba(220,38,38,0.3)',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: '#1C1917',
                      boxShadow: '0 8px 24px rgba(220,38,38,0.15)',
                    }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {revenueByServiceData.map((_entry, index) => {
                      const colors = ['#DC2626', '#E11D48', '#0891B2', '#DB2777', '#4F46E5', '#D97706', '#059669'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Peak Hours Heat */}
          <div className="glass-panel p-6 border border-red-900/15 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C1917] font-['Outfit']">
                Peak Appointment Hours (IST)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0284C7]">
                Hourly Density
              </span>
            </div>
            <p className="text-xs text-[#78716C] mb-4">Demand distribution by time slots</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,38,38,0.12)" />
                  <XAxis dataKey="slot" stroke="#78716C" fontSize={10} />
                  <YAxis stroke="#78716C" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: 'rgba(220,38,38,0.3)',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: '#1C1917',
                      boxShadow: '0 8px 24px rgba(220,38,38,0.15)',
                    }}
                  />
                  <Bar dataKey="appointments" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Appointment Status & Cancellation Rate */}
          <div className="glass-panel p-6 border border-red-900/15 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C1917] font-['Outfit']">
                Appointment Status Breakdown
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Live Ratio
              </span>
            </div>
            <p className="text-xs text-[#78716C] mb-4">Proportion of upcoming, completed, and cancelled visits</p>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: 'rgba(220,38,38,0.3)',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: '#1C1917',
                      boxShadow: '0 8px 24px rgba(220,38,38,0.15)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: APPOINTMENTS TABLE WITH SEARCH, FILTER, SORT, BULK ACTIONS */}
      {activeAdminTab === 'appointments' && (
        <div className="glass-panel p-6 space-y-5 animate-in fade-in duration-200 border border-red-900/15">
          {/* Table Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer, email, phone, ID, or invoice..."
                className="glass-input w-full pl-9 pr-3.5 py-2 text-xs text-[#1C1917] bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="glass-input px-3 py-2 text-xs text-[#1C1917] bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="glass-input px-3 py-2 text-xs text-[#1C1917] bg-white"
            >
              <option value="all">All Providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="glass-input px-3 py-2 text-xs text-[#1C1917] bg-white"
            >
              <option value="all">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedIds.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs animate-in fade-in">
              <span className="font-semibold text-[#1C1917]">
                {selectedIds.length} appointment(s) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    bulkUpdateStatus(selectedIds, 'completed');
                    setSelectedIds([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => {
                    bulkCancel(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-100 text-[#991B1B] hover:bg-red-200 font-semibold"
                >
                  Bulk Cancel
                </button>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-red-50/70 border-b border-red-900/10 text-[#78716C] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedAppointments.length > 0 &&
                        paginatedAppointments.every((a) => selectedIds.includes(a.id))
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded accent-[#DC2626]"
                    />
                  </th>
                  <th className="p-3">Ref ID / Invoice</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Service & Provider</th>
                  <th className="p-3">Date & Time (IST)</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">GST (INR)</th>
                  <th className="p-3 text-right">Total (INR)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-[#78716C]">
                      No matching appointments found.
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((apt) => {
                    const isSelected = selectedIds.includes(apt.id);
                    const taxes = apt.pricing.isInterState
                      ? apt.pricing.igst
                      : apt.pricing.cgst + apt.pricing.sgst;

                    return (
                      <tr
                        key={apt.id}
                        className={`hover:bg-red-50/40 transition-colors ${
                          isSelected ? 'bg-red-50/80' : ''
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(apt.id)}
                            className="rounded accent-[#DC2626]"
                          />
                        </td>
                        <td className="p-3 font-mono font-semibold text-[#1C1917]">
                          <div>{apt.id}</div>
                          <div className="text-[10px] text-[#78716C]">{apt.invoiceNumber}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#1C1917]">{apt.fullName}</div>
                          <div className="text-[10px] text-[#78716C]">{apt.phone} • {apt.state}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#DC2626]">{apt.serviceName}</div>
                          <div className="text-[10px] text-[#78716C]">{apt.providerName}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[#1C1917]">
                            {formatISTDisplayDate(apt.date)}
                          </div>
                          <div className="text-[10px] font-mono text-[#B91C1C] font-semibold">
                            {formatISTTimeDisplay(apt.timeSlot)}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-[#1C1917]">
                          {formatINR(apt.pricing.taxableAmount)}
                        </td>
                        <td className="p-3 text-right font-mono text-[#78716C]">
                          {formatINR(taxes)}
                          <span className="block text-[9px]">
                            {apt.pricing.isInterState ? 'IGST' : 'CGST+SGST'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#991B1B]">
                          {formatINR(apt.pricing.totalAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              apt.status === 'upcoming'
                                ? 'badge-upcoming'
                                : apt.status === 'completed'
                                ? 'badge-completed'
                                : 'badge-cancelled'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => downloadInvoicePDF(apt)}
                            className="p-1 rounded bg-stone-100 hover:bg-red-50 text-[#1C1917] transition-colors"
                            title="Download PDF Tax Invoice"
                          >
                            <Download className="w-3.5 h-3.5 text-[#059669]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-[#78716C] pt-2">
            <span>
              Showing {filteredAppointments.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredAppointments.length)} of{' '}
              {filteredAppointments.length} records
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1C1917] font-medium disabled:opacity-30"
              >
                Prev
              </button>
              <span className="px-2 font-mono text-[#1C1917] font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1C1917] font-medium disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SERVICES CATALOG MANAGEMENT */}
      {activeAdminTab === 'services' && (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in duration-200 border border-red-900/15">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-['Outfit'] text-[#1C1917]">
                Service Catalog & GST Configuration
              </h3>
              <p className="text-xs text-[#78716C]">
                Configure durations, base fees in ₹ INR, and tax SAC classification codes.
              </p>
            </div>
            <button
              onClick={() => setShowAddService(!showAddService)}
              className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>

          {/* Add Service Inline Form */}
          {showAddService && (
            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-4 animate-in fade-in shadow-sm">
              <h4 className="text-xs font-bold text-[#1C1917] uppercase">New Clinical Service</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-[#78716C]">Service Name</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="e.g. Pediatric Consultation"
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">Category</label>
                  <input
                    type="text"
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">Duration (mins)</label>
                  <select
                    value={newService.duration}
                    onChange={(e) =>
                      setNewService({ ...newService, duration: parseInt(e.target.value, 10) })
                    }
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] bg-white mt-1"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">Base Price (INR ₹)</label>
                  <input
                    type="number"
                    value={newService.basePrice}
                    onChange={(e) =>
                      setNewService({ ...newService, basePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] font-mono mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">GST Rate (%)</label>
                  <input
                    type="number"
                    value={newService.gstRate}
                    onChange={(e) =>
                      setNewService({ ...newService, gstRate: parseFloat(e.target.value) || 18 })
                    }
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] font-mono mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">SAC Code</label>
                  <input
                    type="text"
                    value={newService.sacCode}
                    onChange={(e) => setNewService({ ...newService, sacCode: e.target.value })}
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] font-mono mt-1 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddService(false)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newService.name) return;
                    addService({
                      id: `srv-${Date.now()}`,
                      name: newService.name,
                      category: newService.category || 'Healthcare',
                      duration: newService.duration || 30,
                      basePrice: newService.basePrice || 1000,
                      gstRate: newService.gstRate || 18,
                      sacCode: newService.sacCode || '998311',
                      description: 'Clinical consultation and diagnostic session.',
                    });
                    setShowAddService(false);
                  }}
                  className="btn-primary px-4 py-1.5 text-xs font-semibold"
                >
                  Save Service
                </button>
              </div>
            </div>
          )}

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-[#991B1B] font-semibold border border-red-200">
                      {srv.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#991B1B]">
                      {formatINR(srv.basePrice)}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#1C1917] text-sm">{srv.name}</h4>
                  <p className="text-xs text-[#78716C] mt-1 line-clamp-2">{srv.description}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-[#78716C]">
                  <span>{srv.duration} mins • SAC {srv.sacCode}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-[#047857] font-semibold border border-emerald-200">
                      GST {srv.gstRate}%
                    </span>
                    <button
                      onClick={() => deleteService(srv.id)}
                      className="p-1 text-[#78716C] hover:text-[#DC2626]"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: STAFF PROVIDERS MANAGEMENT */}
      {activeAdminTab === 'providers' && (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in duration-200 border border-red-900/15">
          <div>
            <h3 className="text-lg font-bold font-['Outfit'] text-[#1C1917]">
              Medical Staff & Specialist Providers
            </h3>
            <p className="text-xs text-[#78716C]">
              Configure working hours, days off, and provider specialties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-12 h-12 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <h4 className="font-bold text-[#1C1917] text-sm">{p.name}</h4>
                    <p className="text-[11px] text-[#DC2626] font-semibold">{p.role}</p>
                    <p className="text-[10px] text-[#78716C]">Rating: {p.rating} ★ ({p.reviewCount} reviews)</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-stone-100 pt-3">
                  <div className="flex justify-between text-[#78716C]">
                    <span>Operating Hours:</span>
                    <span className="font-mono text-[#1C1917] font-semibold">
                      {p.workingHours.start} - {p.workingHours.end} IST
                    </span>
                  </div>
                  <div className="flex justify-between text-[#78716C]">
                    <span>Days Off:</span>
                    <span className="text-[#DC2626] font-medium">
                      {p.daysOff.includes(0) ? 'Sunday' : p.daysOff.includes(1) ? 'Monday' : 'Configured'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {p.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-[#1C1917]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: COUPONS */}
      {activeAdminTab === 'coupons' && (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in duration-200 border border-red-900/15">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-['Outfit'] text-[#1C1917]">
                Promotional Coupons
              </h3>
              <p className="text-xs text-[#78716C]">
                Discounts apply strictly BEFORE GST calculation.
              </p>
            </div>
            <button
              onClick={() => setShowAddCoupon(!showAddCoupon)}
              className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          {showAddCoupon && (
            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-[#78716C]">Coupon Code</label>
                  <input
                    type="text"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. DIWALI30"
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] uppercase mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">Type</label>
                  <select
                    value={newCoupon.type}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, type: e.target.value as any })
                    }
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] bg-white mt-1"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">Value</label>
                  <input
                    type="number"
                    value={newCoupon.value}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, value: parseFloat(e.target.value) || 0 })
                    }
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#78716C]">Min Service Value (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.minAmount}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, minAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="glass-input w-full px-3 py-2 text-xs text-[#1C1917] mt-1 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddCoupon(false)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newCoupon.code) return;
                    addCoupon({
                      code: newCoupon.code,
                      type: newCoupon.type || 'percentage',
                      value: newCoupon.value || 10,
                      minAmount: newCoupon.minAmount || 500,
                      description: 'Promotional discount offer',
                      expiryDate: newCoupon.expiryDate || '2026-12-31',
                      isActive: true,
                    });
                    setShowAddCoupon(false);
                  }}
                  className="btn-primary px-4 py-1.5 text-xs font-semibold"
                >
                  Save Coupon
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {coupons.map((c) => (
              <div
                key={c.code}
                className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1C1917] text-sm tracking-wider">
                      {c.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.isActive ? 'bg-emerald-50 text-[#047857] border border-emerald-200' : 'bg-red-50 text-[#B91C1C] border border-red-200'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-[#DC2626] mt-1 font-semibold">
                    {c.type === 'percentage' ? `${c.value}% Off` : `₹${c.value} Flat Off`}
                  </p>
                  <p className="text-[11px] text-[#78716C] mt-1">{c.description}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleCoupon(c.code)}
                    className="text-[11px] text-[#DC2626] hover:underline font-semibold"
                  >
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.code)}
                    className="p-1 text-[#78716C] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 6: HOLIDAYS & BLOCKED DATES */}
      {activeAdminTab === 'holidays' && (
        <div className="glass-panel p-6 space-y-6 animate-in fade-in duration-200 border border-red-900/15">
          <div>
            <h3 className="text-lg font-bold font-['Outfit'] text-[#1C1917]">
              Indian Public Holidays & Blocked Dates
            </h3>
            <p className="text-xs text-[#78716C]">
              Dates marked here prevent client slot generation and bookings automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Public Holidays */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-[#1C1917] uppercase">Indian Public Holidays</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {holidays.map((h) => (
                  <div
                    key={h.date}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#1C1917]">{h.name}</span>
                      <span className="block text-[10px] font-mono text-[#DC2626] font-semibold">
                        {formatISTDisplayDate(h.date)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeHoliday(h.date)}
                      className="p-1 text-[#78716C] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocked Dates Toggle */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-[#1C1917] uppercase">Emergency Block Dates</h4>
              <p className="text-[11px] text-[#78716C]">
                Select any custom date to close clinic reservations temporarily.
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  min={todayIST}
                  onChange={(e) => {
                    if (e.target.value) toggleBlockDate(e.target.value);
                  }}
                  className="glass-input px-3 py-2 text-xs text-[#1C1917] bg-white"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                {blockedDates.length === 0 ? (
                  <p className="text-xs text-[#78716C]">No admin blocked dates currently active.</p>
                ) : (
                  blockedDates.map((d) => (
                    <div
                      key={d}
                      className="p-2 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-[#991B1B]"
                    >
                      <span>Clinic Closed on {formatISTDisplayDate(d)}</span>
                      <button
                        onClick={() => toggleBlockDate(d)}
                        className="text-xs underline text-[#DC2626] font-semibold"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 7: AUDIT & ACTIVITY LOG */}
      {activeAdminTab === 'audit' && (
        <div className="glass-panel p-6 space-y-4 animate-in fade-in duration-200 border border-red-900/15">
          <div>
            <h3 className="text-lg font-bold font-['Outfit'] text-[#1C1917]">
              System Audit & Activity Trail
            </h3>
            <p className="text-xs text-[#78716C]">
              Immutable log of every booking, reschedule, cancellation, and refund timestamped in IST.
            </p>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-white border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.type === 'booking'
                          ? 'bg-[#059669]'
                          : log.type === 'cancellation'
                          ? 'bg-[#DC2626]'
                          : log.type === 'reschedule'
                          ? 'bg-[#D97706]'
                          : 'bg-sky-600'
                      }`}
                    />
                    <span className="font-bold text-[#1C1917]">{log.title}</span>
                  </div>
                  <p className="text-[#78716C] mt-0.5">{log.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-[#DC2626] font-semibold">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
