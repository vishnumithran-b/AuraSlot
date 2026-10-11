import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  ServiceOption,
  Provider,
  Coupon,
  PublicHoliday,
} from '../types/appointment';
import {
  BUSINESS_PRESETS,
  type BusinessTypeId,
  type BusinessLabels,
  type BusinessProfile,
  type CategoryOption,
  type CustomFieldDefinition,
} from '../config/businessTypes';
import {
  SEED_SERVICES,
  SEED_PROVIDERS,
  SEED_HOLIDAYS,
  SEED_COUPONS,
  SEED_CATEGORIES,
  SEED_CUSTOM_FIELDS,
} from '../data/seedData';
import { BUSINESS_CONFIG } from '../utils/gst';

interface ScheduleSettings {
  startHour: number;
  endHour: number;
  bufferMinutes: number;
  lunchBreakStart: string;
  lunchBreakEnd: string;
}

interface SettingsContextType {
  businessTypeId: BusinessTypeId;
  labels: BusinessLabels;
  businessProfile: BusinessProfile;
  categories: CategoryOption[];
  customFields: CustomFieldDefinition[];
  services: ServiceOption[];
  providers: Provider[];
  holidays: PublicHoliday[];
  coupons: Coupon[];
  blockedDates: string[];
  scheduleSettings: ScheduleSettings;
  businessConfig: typeof BUSINESS_CONFIG;
  setBusinessTypeId: (id: BusinessTypeId, loadPresetDefaults?: boolean) => void;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  addCategory: (cat: CategoryOption) => void;
  updateCategory: (id: string, cat: Partial<CategoryOption>) => void;
  deleteCategory: (id: string) => void;
  addCustomField: (field: CustomFieldDefinition) => void;
  updateCustomField: (id: string, field: Partial<CustomFieldDefinition>) => void;
  deleteCustomField: (id: string) => void;
  addService: (service: ServiceOption) => void;
  updateService: (id: string, service: Partial<ServiceOption>) => void;
  deleteService: (id: string) => void;
  addProvider: (provider: Provider) => void;
  updateProvider: (id: string, provider: Partial<Provider>) => void;
  deleteProvider: (id: string) => void;
  addCoupon: (coupon: Coupon) => void;
  toggleCoupon: (code: string) => void;
  deleteCoupon: (code: string) => void;
  addHoliday: (holiday: PublicHoliday) => void;
  removeHoliday: (date: string) => void;
  toggleBlockDate: (date: string) => void;
  updateScheduleSettings: (settings: Partial<ScheduleSettings>) => void;
  resetAllSettings: () => void;
}

const SETTINGS_KEY = 'auraslot_settings_state_v3';

const defaultScheduleSettings: ScheduleSettings = {
  startHour: 9,
  endHour: 18,
  bufferMinutes: 10,
  lunchBreakStart: '13:00',
  lunchBreakEnd: '14:00',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Business Type Selection (Default: general)
  const [businessTypeId, setBusinessTypeIdState] = useState<BusinessTypeId>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_biz_type`);
      if (stored && stored in BUSINESS_PRESETS) {
        return stored as BusinessTypeId;
      }
      return 'general';
    } catch {
      return 'general';
    }
  });

  // Current Preset fallback
  const currentPreset = useMemo(() => {
    return BUSINESS_PRESETS[businessTypeId] || BUSINESS_PRESETS.general;
  }, [businessTypeId]);

  // Dynamic Labels
  const labels = useMemo(() => {
    return currentPreset.labels;
  }, [currentPreset]);

  // 2. Business Profile
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_profile`);
      return stored ? JSON.parse(stored) : currentPreset.businessProfile;
    } catch {
      return currentPreset.businessProfile;
    }
  });

  // 3. Categories
  const [categories, setCategories] = useState<CategoryOption[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_categories`);
      return stored ? JSON.parse(stored) : SEED_CATEGORIES;
    } catch {
      return SEED_CATEGORIES;
    }
  });

  // 4. Custom Fields
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_custom_fields`);
      return stored ? JSON.parse(stored) : SEED_CUSTOM_FIELDS;
    } catch {
      return SEED_CUSTOM_FIELDS;
    }
  });

  // 5. Services
  const [services, setServices] = useState<ServiceOption[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_services`);
      return stored ? JSON.parse(stored) : SEED_SERVICES;
    } catch {
      return SEED_SERVICES;
    }
  });

  // 6. Providers
  const [providers, setProviders] = useState<Provider[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_providers`);
      return stored ? JSON.parse(stored) : SEED_PROVIDERS;
    } catch {
      return SEED_PROVIDERS;
    }
  });

  // 7. Holidays
  const [holidays, setHolidays] = useState<PublicHoliday[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_holidays`);
      return stored ? JSON.parse(stored) : SEED_HOLIDAYS;
    } catch {
      return SEED_HOLIDAYS;
    }
  });

  // 8. Coupons
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_coupons`);
      return stored ? JSON.parse(stored) : SEED_COUPONS;
    } catch {
      return SEED_COUPONS;
    }
  });

  // 9. Blocked Dates
  const [blockedDates, setBlockedDates] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_blocked_dates`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 10. Schedule Settings
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(() => {
    try {
      const stored = localStorage.getItem(`${SETTINGS_KEY}_schedule`);
      return stored ? JSON.parse(stored) : defaultScheduleSettings;
    } catch {
      return defaultScheduleSettings;
    }
  });

  // LocalStorage synchronizations
  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_biz_type`, businessTypeId);
  }, [businessTypeId]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_profile`, JSON.stringify(businessProfile));
  }, [businessProfile]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_categories`, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_custom_fields`, JSON.stringify(customFields));
  }, [customFields]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_services`, JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_providers`, JSON.stringify(providers));
  }, [providers]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_holidays`, JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_coupons`, JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_blocked_dates`, JSON.stringify(blockedDates));
  }, [blockedDates]);

  useEffect(() => {
    localStorage.setItem(`${SETTINGS_KEY}_schedule`, JSON.stringify(scheduleSettings));
  }, [scheduleSettings]);

  // Business Type Switcher
  const setBusinessTypeId = (id: BusinessTypeId, loadPresetDefaults: boolean = true) => {
    setBusinessTypeIdState(id);
    const preset = BUSINESS_PRESETS[id] || BUSINESS_PRESETS.general;
    if (loadPresetDefaults) {
      setBusinessProfile(preset.businessProfile);
      setCategories(preset.defaultCategories);
      setServices(preset.defaultServices);
      setProviders(preset.defaultProviders);
      setCustomFields(preset.defaultCustomFields);
      setScheduleSettings((prev) => ({
        ...prev,
        bufferMinutes: preset.bufferMinutes,
        startHour: parseInt(preset.sampleWorkingHours.start.split(':')[0], 10) || 9,
        endHour: parseInt(preset.sampleWorkingHours.end.split(':')[0], 10) || 18,
      }));
    }
  };

  const updateBusinessProfile = (prof: Partial<BusinessProfile>) => {
    setBusinessProfile((prev) => ({ ...prev, ...prof }));
  };

  const addCategory = (cat: CategoryOption) => {
    setCategories((prev) => [...prev, cat]);
  };

  const updateCategory = (id: string, cat: Partial<CategoryOption>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...cat } : c)));
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => [...prev, field]);
  };

  const updateCustomField = (id: string, field: Partial<CustomFieldDefinition>) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...field } : f)));
  };

  const deleteCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const addService = (srv: ServiceOption) => {
    setServices((prev) => [...prev, srv]);
  };

  const updateService = (id: string, srv: Partial<ServiceOption>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...srv } : s)));
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addProvider = (prov: Provider) => {
    setProviders((prev) => [...prev, prov]);
  };

  const updateProvider = (id: string, prov: Partial<Provider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...prov } : p)));
  };

  const deleteProvider = (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
  };

  const addCoupon = (c: Coupon) => {
    setCoupons((prev) => [...prev.filter((existing) => existing.code !== c.code), c]);
  };

  const toggleCoupon = (code: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const deleteCoupon = (code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
  };

  const addHoliday = (h: PublicHoliday) => {
    setHolidays((prev) => [...prev.filter((existing) => existing.date !== h.date), h]);
  };

  const removeHoliday = (date: string) => {
    setHolidays((prev) => prev.filter((h) => h.date !== date));
  };

  const toggleBlockDate = (date: string) => {
    setBlockedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const updateScheduleSettings = (settings: Partial<ScheduleSettings>) => {
    setScheduleSettings((prev) => ({ ...prev, ...settings }));
  };

  const resetAllSettings = () => {
    setBusinessTypeIdState('general');
    setBusinessProfile(BUSINESS_PRESETS.general.businessProfile);
    setCategories(SEED_CATEGORIES);
    setCustomFields(SEED_CUSTOM_FIELDS);
    setServices(SEED_SERVICES);
    setProviders(SEED_PROVIDERS);
    setHolidays(SEED_HOLIDAYS);
    setCoupons(SEED_COUPONS);
    setBlockedDates([]);
    setScheduleSettings(defaultScheduleSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        businessTypeId,
        labels,
        businessProfile,
        categories,
        customFields,
        services,
        providers,
        holidays,
        coupons,
        blockedDates,
        scheduleSettings,
        businessConfig: BUSINESS_CONFIG,
        setBusinessTypeId,
        updateBusinessProfile,
        addCategory,
        updateCategory,
        deleteCategory,
        addCustomField,
        updateCustomField,
        deleteCustomField,
        addService,
        updateService,
        deleteService,
        addProvider,
        updateProvider,
        deleteProvider,
        addCoupon,
        toggleCoupon,
        deleteCoupon,
        addHoliday,
        removeHoliday,
        toggleBlockDate,
        updateScheduleSettings,
        resetAllSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const useLabels = (): BusinessLabels => {
  const { labels } = useSettings();
  return labels;
};
