import {
  SEED_SERVICES,
  SEED_PROVIDERS,
  SEED_APPOINTMENTS,
  SEED_HOLIDAYS,
  SEED_COUPONS,
} from '../data/seedData';
import { DEFAULT_SCHEDULE_CONFIG } from './slots';

export const STORAGE_KEY = 'auraslot_appointments_master_v2';
export const THEME_KEY = 'auraslot_theme_v2';

export const SERVICES = SEED_SERVICES;
export const PROVIDERS = SEED_PROVIDERS;
export const SCHEDULE_CONFIG = DEFAULT_SCHEDULE_CONFIG;
export const INITIAL_SEED_APPOINTMENTS = SEED_APPOINTMENTS;
export const HOLIDAYS = SEED_HOLIDAYS;
export const COUPONS = SEED_COUPONS;
