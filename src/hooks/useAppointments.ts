import { useAppointmentsContext } from '../context/AppointmentsContext';

export const useAppointments = () => {
  const context = useAppointmentsContext();

  const stats = {
    total: context.appointments.length,
    upcoming: context.appointments.filter((a) => a.status === 'upcoming').length,
    completed: context.appointments.filter((a) => a.status === 'completed').length,
    cancelled: context.appointments.filter((a) => a.status === 'cancelled').length,
  };

  return {
    ...context,
    stats,
  };
};
