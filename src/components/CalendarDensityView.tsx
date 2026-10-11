import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useSettings, useLabels } from '../context/SettingsContext';
import {
  formatISTDisplayDate,
  formatISTTimeDisplay,
  getTodayISTDateString,
} from '../utils/date-ist';
import { isPublicHoliday } from '../utils/slots';
import type { Appointment } from '../types/appointment';

interface CalendarDensityViewProps {
  onSelectDateToBook: (dateStr: string) => void;
}

export const CalendarDensityView: React.FC<CalendarDensityViewProps> = ({
  onSelectDateToBook,
}) => {
  const { appointments } = useAppointmentsContext();
  const { holidays, blockedDates } = useSettings();
  const labels = useLabels();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDayDetails, setSelectedDayDetails] = useState<string | null>(null);

  const todayIST = getTodayISTDateString();

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(prev.getMonth() - 1);
      } else {
        next.setDate(prev.getDate() - 7);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(prev.getMonth() + 1);
      } else {
        next.setDate(prev.getDate() + 7);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month days generation
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayIndex = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    const days = [];

    // Pad previous month days
    for (let i = 0; i < startingDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: null, isCurrentMonth: false });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentDate]);

  // Appointments mapping by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (a.status !== 'cancelled') {
        if (!map[a.date]) map[a.date] = [];
        map[a.date].push(a);
      }
    }
    return map;
  }, [appointments]);

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate]);

  const selectedDayAppointments = selectedDayDetails
    ? appointmentsByDate[selectedDayDetails] || []
    : [];

  return (
    <div className="space-y-6">
      {/* View Header & Controls */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-red-900/15">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#DC2626] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>IST Appointment Schedule Density</span>
          </div>
          <h2 className="text-2xl font-bold font-['Outfit'] text-[#1C1917]">
            {monthYearLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white font-semibold shadow-sm'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Month Heatmap
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] text-white font-semibold shadow-sm'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Week View
            </button>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 rounded-xl border border-stone-200 p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-[#1C1917] transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs text-[#1C1917] font-semibold hover:bg-stone-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-[#1C1917] transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-[#78716C]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-stone-300 shadow-xs" />
            <span className="font-medium">Open (0 booked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 shadow-xs" />
            <span className="font-medium text-emerald-800">Light (1-2 booked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 shadow-xs" />
            <span className="font-medium text-amber-800">Moderate (3-4 booked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500 text-white shadow-xs" />
            <span className="font-medium text-[#B91C1C]">High Density (5+ booked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-100 border border-orange-400 shadow-xs" />
            <span className="font-medium text-orange-800">Holiday / Off</span>
          </div>
        </div>

        <span className="text-[11px] font-mono text-[#DC2626] font-bold">Click any date to inspect slots</span>
      </div>

      {/* Month Heatmap Grid */}
      <div className="glass-panel p-4 sm:p-6 border border-red-900/15 shadow-md">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-[#78716C]">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((item, idx) => {
            if (!item.isCurrentMonth || !item.dateStr) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="h-20 sm:h-24 rounded-2xl bg-stone-100/40 border border-stone-200/40 opacity-40"
                />
              );
            }

            const isToday = item.dateStr === todayIST;
            const holiday = isPublicHoliday(item.dateStr, holidays);
            const isBlocked = blockedDates.includes(item.dateStr);
            const dayApts = appointmentsByDate[item.dateStr] || [];
            const count = dayApts.length;
            const isSelected = selectedDayDetails === item.dateStr;

            // Density styling
            let densityBg = 'bg-white/90 border-stone-200 hover:border-red-300 hover:bg-red-50/40 shadow-xs';
            if (holiday || isBlocked) {
              densityBg = 'bg-orange-50 border-orange-300 text-orange-950';
            } else if (count >= 5) {
              densityBg = 'bg-gradient-to-br from-red-100 to-rose-200 border-red-400 hover:bg-red-200 text-red-950 font-bold shadow-sm';
            } else if (count >= 3) {
              densityBg = 'bg-gradient-to-br from-amber-50 to-amber-100/90 border-amber-300 hover:bg-amber-100 text-amber-950';
            } else if (count >= 1) {
              densityBg = 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 hover:bg-emerald-100/80 text-emerald-950';
            }

            return (
              <div
                key={item.dateStr}
                onClick={() => setSelectedDayDetails(item.dateStr)}
                className={`h-20 sm:h-24 p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${densityBg} ${
                  isSelected ? 'ring-2 ring-[#DC2626] shadow-xl scale-[1.02]' : ''
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-lg ${
                      isToday
                        ? 'bg-gradient-to-br from-[#DC2626] to-[#F43F5E] text-white font-extrabold shadow-sm'
                        : 'text-[#1C1917]'
                    }`}
                  >
                    {item.dayNumber}
                  </span>

                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/90 text-[#991B1B] font-bold border border-red-200 shadow-xs">
                      {count} {count === 1 ? labels.appointment.toLowerCase() : labels.appointments.toLowerCase()}
                    </span>
                  )}
                </div>

                {/* Holiday or density details */}
                <div className="text-[10px] leading-tight line-clamp-2">
                  {holiday ? (
                    <span className="text-amber-800 font-semibold">Holiday: {holiday.name}</span>
                  ) : isBlocked ? (
                    <span className="text-red-700 font-semibold">{labels.venue} Closed</span>
                  ) : count > 0 ? (
                    <span className="text-[#78716C] hidden sm:inline font-medium">
                      {dayApts[0].serviceName}
                      {count > 1 ? ` +${count - 1}` : ''}
                    </span>
                  ) : (
                    <span className="text-stone-400 hidden sm:inline">Slots Open</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector Panel */}
      {selectedDayDetails && (
        <div className="glass-panel p-6 animate-in fade-in duration-200 border border-red-900/15">
          <div className="flex items-center justify-between pb-4 border-b border-red-900/10 mb-4">
            <div>
              <h3 className="text-lg font-bold font-['Outfit'] text-[#1C1917]">
                Schedule for {formatISTDisplayDate(selectedDayDetails)}
              </h3>
              <p className="text-xs text-[#78716C]">
                {selectedDayAppointments.length} confirmed appointments
              </p>
            </div>
            <button
              onClick={() => onSelectDateToBook(selectedDayDetails)}
              className="btn-primary px-4 py-2 text-xs font-semibold"
            >
              Book on this Date
            </button>
          </div>

          {selectedDayAppointments.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#78716C]">
              No appointments booked yet on this date. All standard operating hours are open for reservation!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedDayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1C1917]">{apt.fullName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-[#B91C1C] border border-red-200 font-semibold">
                      {formatISTTimeDisplay(apt.timeSlot)}
                    </span>
                  </div>
                  <p className="text-[#78716C] text-[11px]">{apt.serviceName}</p>
                  <p className="text-[10px] text-[#78716C]">{labels.professional}: {apt.providerName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
