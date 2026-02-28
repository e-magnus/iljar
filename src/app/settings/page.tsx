'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authFetch } from '@/lib/api/client';
import { logoutSession } from '@/lib/auth/session';
import { useRouter } from 'next/navigation';
import {
  applyDensity,
  applyFontSize,
  applyLanguage,
  applyTheme,
  DEFAULT_DENSITY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LANGUAGE,
  DEFAULT_START_PAGE,
  DEFAULT_THEME,
  DENSITY_STORAGE_KEY,
  FONT_SIZE_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  resolveStoredDensity,
  resolveStoredFontSize,
  resolveStoredLanguage,
  resolveStoredStartPage,
  START_PAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type AppDensity,
  type AppFontSize,
  type AppLanguage,
  type AppStartPage,
  type AppTheme,
} from '@/components/ui/ThemeInitializer';

interface WorkingHour {
  weekday: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  displayOrder: number;
  isDefault: boolean;
}

interface CustomFlag {
  label: string;
  icon: string;
}

interface SettingsResponse {
  security: {
    totpEnabled: boolean;
  };
  booking: {
    slotLength: number;
    bufferTime: number;
  };
  scheduling: {
    blockRedDays: boolean;
    workingHours: WorkingHour[];
  };
  clinical: {
    customFlags: CustomFlag[];
  };
  clients: {
    overview: {
      showKennitala: boolean;
      showPhone: boolean;
      showFlags: boolean;
    };
  };
  notifications: {
    remindersConfigured: boolean;
  };
  updatedAt: string | null;
}

interface ClientOverviewVisibility {
  showKennitala: boolean;
  showPhone: boolean;
  showFlags: boolean;
}

interface UserProfile {
  fullName: string;
  phone: string;
  kennitala: string;
  companyName: string;
  streetAddress: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  invoiceEmail: string;
  bankAccount: string;
  iban: string;
  swiftCode: string;
  vatNumber: string;
  invoiceNotes: string;
}

const defaultClientOverviewVisibility: ClientOverviewVisibility = {
  showKennitala: true,
  showPhone: true,
  showFlags: true,
};

const defaultUserProfile: UserProfile = {
  fullName: '',
  phone: '',
  kennitala: '',
  companyName: '',
  streetAddress: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  country: '',
  invoiceEmail: '',
  bankAccount: '',
  iban: '',
  swiftCode: '',
  vatNumber: '',
  invoiceNotes: '',
};

function normalizeUserProfile(input: unknown): UserProfile {
  if (typeof input !== 'object' || input === null) {
    return defaultUserProfile;
  }

  const value = input as Partial<Record<keyof UserProfile, unknown>>;
  return {
    fullName: typeof value.fullName === 'string' ? value.fullName : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    kennitala: typeof value.kennitala === 'string' ? value.kennitala : '',
    companyName: typeof value.companyName === 'string' ? value.companyName : '',
    streetAddress: typeof value.streetAddress === 'string' ? value.streetAddress : '',
    addressLine2: typeof value.addressLine2 === 'string' ? value.addressLine2 : '',
    postalCode: typeof value.postalCode === 'string' ? value.postalCode : '',
    city: typeof value.city === 'string' ? value.city : '',
    country: typeof value.country === 'string' ? value.country : '',
    invoiceEmail: typeof value.invoiceEmail === 'string' ? value.invoiceEmail : '',
    bankAccount: typeof value.bankAccount === 'string' ? value.bankAccount : '',
    iban: typeof value.iban === 'string' ? value.iban : '',
    swiftCode: typeof value.swiftCode === 'string' ? value.swiftCode : '',
    vatNumber: typeof value.vatNumber === 'string' ? value.vatNumber : '',
    invoiceNotes: typeof value.invoiceNotes === 'string' ? value.invoiceNotes : '',
  };
}

const weekdayLabels: Record<number, string> = {
  0: 'Sunnudagur',
  1: 'Mánudagur',
  2: 'Þriðjudagur',
  3: 'Miðvikudagur',
  4: 'Fimmtudagur',
  5: 'Föstudagur',
  6: 'Laugardagur',
};

const weekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0];
const clinicalFlagIconOptions = ['🩸', '🧪', '⚠️', '🦶', '❤️', 'ℹ️', '🫀', '🫁', '🦴', '💊', '🩹', '🧬'];
const builtInClinicalFlags: CustomFlag[] = [
  { label: 'Blóðþynning', icon: '🩸' },
  { label: 'Sykursýki', icon: '🧪' },
  { label: 'Ofnæmi', icon: '⚠️' },
  { label: 'Taugakvilli', icon: '🦶' },
  { label: 'Gangráður', icon: '❤️' },
  { label: 'Annað', icon: 'ℹ️' },
];
const FLAGS_CONFIG_MARKER = '__FLAGS_CONFIGURED_V1__';

function isFlagsConfigMarker(label: string): boolean {
  return label === FLAGS_CONFIG_MARKER;
}

function defaultWorkingHours(): WorkingHour[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: weekday >= 1 && weekday <= 5,
    startTime: '09:00',
    endTime: '17:00',
  }));
}

function normalizeWorkingHours(input: WorkingHour[] | undefined): WorkingHour[] {
  const fallback = defaultWorkingHours();
  if (!input || input.length === 0) {
    return fallback;
  }

  const byWeekday = new Map(input.map((item) => [item.weekday, item]));
  return fallback.map((item) => {
    const existing = byWeekday.get(item.weekday);
    return existing
      ? {
          weekday: item.weekday,
          enabled: existing.enabled,
          startTime: existing.startTime,
          endTime: existing.endTime,
        }
      : item;
  });
}

function isTimeFormat(value: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(value);
}

function normalizeFlagLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeFlags(input: CustomFlag[]): CustomFlag[] {
  const deduped = new Map<string, CustomFlag>();

  for (const item of input) {
    const label = normalizeFlagLabel(item.label);
    if (!label) {
      continue;
    }

    const key = label.toLocaleLowerCase('is');
    if (!deduped.has(key)) {
      deduped.set(key, {
        label,
        icon: clinicalFlagIconOptions.includes(item.icon) ? item.icon : 'ℹ️',
      });
    }
  }

  return Array.from(deduped.values());
}

function readFlags(input: unknown): CustomFlag[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const parsed: CustomFlag[] = [];
  for (const item of input) {
    if (typeof item === 'string') {
      parsed.push({ label: item, icon: 'ℹ️' });
      continue;
    }

    const value = item as { label?: unknown; icon?: unknown };
    if (typeof value?.label !== 'string') {
      continue;
    }

    parsed.push({
      label: value.label,
      icon: typeof value.icon === 'string' ? value.icon : 'ℹ️',
    });
  }

  return normalizeFlags(parsed);
}

function resolveManagedFlags(input: CustomFlag[]): CustomFlag[] {
  const hasConfiguredMarker = input.some((flag) => isFlagsConfigMarker(flag.label));
  const withoutMarker = input.filter((flag) => !isFlagsConfigMarker(flag.label));

  if (hasConfiguredMarker) {
    return withoutMarker;
  }

  return normalizeFlags([...builtInClinicalFlags, ...withoutMarker]);
}

type SettingsSectionKey = 'general' | 'security' | 'calendar' | 'clients';
type SettingsSubSectionKey =
  | 'general-theme'
  | 'general-language'
  | 'general-start-page'
  | 'general-density'
  | 'general-font-size'
  | 'general-profile-billing'
  | 'security-2fa'
  | 'security-password'
  | 'security-notifications'
  | 'calendar-slots'
  | 'calendar-working-hours'
  | 'calendar-services'
  | 'clients-overview'
  | 'clients-flags';

interface SettingsSectionProps {
  id?: string;
  title: string;
  sectionKey: SettingsSectionKey;
  openSection: SettingsSectionKey | null;
  onToggle: (section: SettingsSectionKey) => void;
  children: ReactNode;
  className?: string;
}

function SettingsSection({ id, title, sectionKey, openSection, onToggle, children, className = '' }: SettingsSectionProps) {
  const isOpen = openSection === sectionKey;

  return (
    <div id={id} className={className}>
      <Card>
        <CardHeader className={isOpen ? '' : 'border-b-0'}>
          <button
            type="button"
            onClick={() => onToggle(sectionKey)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={isOpen}
          >
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
            <span className={`text-lg text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden>
              ›
            </span>
          </button>
        </CardHeader>
        {isOpen ? <CardContent>{children}</CardContent> : null}
      </Card>
    </div>
  );
}

interface SettingsSubSectionProps {
  title: string;
  subSectionKey: SettingsSubSectionKey;
  openSubSection: SettingsSubSectionKey | null;
  onToggle: (subSection: SettingsSubSectionKey) => void;
  children: ReactNode;
}

function SettingsSubSection({ title, subSectionKey, openSubSection, onToggle, children }: SettingsSubSectionProps) {
  const isOpen = openSubSection === subSectionKey;

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => onToggle(subSectionKey)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-900">{title}</span>
        <span className={`text-lg text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden>
          ›
        </span>
      </button>
      {isOpen ? <div className="border-t border-gray-200 p-4">{children}</div> : null}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingScheduling, setSavingScheduling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [remindersConfigured, setRemindersConfigured] = useState(false);
  const [slotLength, setSlotLength] = useState(30);
  const [bufferTime, setBufferTime] = useState(5);
  const [initialSlotLength, setInitialSlotLength] = useState(30);
  const [initialBufferTime, setInitialBufferTime] = useState(5);
  const [blockRedDays, setBlockRedDays] = useState(false);
  const [initialBlockRedDays, setInitialBlockRedDays] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(defaultWorkingHours());
  const [initialWorkingHours, setInitialWorkingHours] = useState<WorkingHour[]>(defaultWorkingHours());
  const [customFlags, setCustomFlags] = useState<CustomFlag[]>([]);
  const [initialCustomFlags, setInitialCustomFlags] = useState<CustomFlag[]>([]);
  const [customFlagLabel, setCustomFlagLabel] = useState('');
  const [customFlagIcon, setCustomFlagIcon] = useState('ℹ️');
  const [editingFlagLabel, setEditingFlagLabel] = useState<string | null>(null);
  const [draggingFlagLabel, setDraggingFlagLabel] = useState<string | null>(null);
  const [dragOverFlagLabel, setDragOverFlagLabel] = useState<string | null>(null);
  const [savingFlags, setSavingFlags] = useState(false);
  const [refreshingFlags, setRefreshingFlags] = useState(false);
  const [flagError, setFlagError] = useState('');
  const [flagSuccess, setFlagSuccess] = useState('');

  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrCode, setTotpQrCode] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [totpSuccess, setTotpSuccess] = useState('');
  const [showDisableTotp, setShowDisableTotp] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState(30);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [serviceSuccess, setServiceSuccess] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [draggingServiceId, setDraggingServiceId] = useState<string | null>(null);
  const [dragOverServiceId, setDragOverServiceId] = useState<string | null>(null);
  const [serviceRefreshing, setServiceRefreshing] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSectionKey | null>(null);
  const [openSubSection, setOpenSubSection] = useState<SettingsSubSectionKey | null>(null);
  const [clientOverviewVisibility, setClientOverviewVisibility] = useState<ClientOverviewVisibility>(defaultClientOverviewVisibility);
  const [initialClientOverviewVisibility, setInitialClientOverviewVisibility] = useState<ClientOverviewVisibility>(defaultClientOverviewVisibility);
  const [savingClientOverview, setSavingClientOverview] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [initialUserProfile, setInitialUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [savingUserProfile, setSavingUserProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [appTheme, setAppTheme] = useState<AppTheme>('light');
  const [appLanguage, setAppLanguage] = useState<AppLanguage>('is');
  const [appStartPage, setAppStartPage] = useState<AppStartPage>('/dashboard');
  const [appDensity, setAppDensity] = useState<AppDensity>('comfortable');
  const [appFontSize, setAppFontSize] = useState<AppFontSize>('medium');

  const slotLengthValid = Number.isInteger(slotLength) && slotLength >= 5 && slotLength <= 180;
  const bufferTimeValid = Number.isInteger(bufferTime) && bufferTime >= 0 && bufferTime <= 60;
  const hasBookingChanges = slotLength !== initialSlotLength || bufferTime !== initialBufferTime;
  const canSaveBooking = slotLengthValid && bufferTimeValid && hasBookingChanges && !savingBooking;

  const hasSchedulingChanges =
    blockRedDays !== initialBlockRedDays || JSON.stringify(workingHours) !== JSON.stringify(initialWorkingHours);

  const workingHoursValid = useMemo(() => {
    return workingHours.every((day) => {
      if (!isTimeFormat(day.startTime) || !isTimeFormat(day.endTime)) {
        return false;
      }

      if (!day.enabled) {
        return true;
      }

      return day.startTime < day.endTime;
    });
  }, [workingHours]);

  const canSaveScheduling = hasSchedulingChanges && workingHoursValid && !savingScheduling;
  const hasFlagChanges = JSON.stringify(customFlags) !== JSON.stringify(initialCustomFlags);
  const canSaveFlags = hasFlagChanges && !savingFlags;
  const hasClientOverviewChanges = JSON.stringify(clientOverviewVisibility) !== JSON.stringify(initialClientOverviewVisibility);
  const canSaveClientOverview = hasClientOverviewChanges && !savingClientOverview;
  const hasUserProfileChanges = JSON.stringify(userProfile) !== JSON.stringify(initialUserProfile);
  const canSaveUserProfile = hasUserProfileChanges && !savingUserProfile;

  const bookingValidationMessage = useMemo(() => {
    if (!slotLengthValid) {
      return 'Lengd tíma þarf að vera heiltala á bilinu 5-180.';
    }

    if (!bufferTimeValid) {
      return 'Bil milli tíma þarf að vera heiltala á bilinu 0-60.';
    }

    return '';
  }, [slotLengthValid, bufferTimeValid]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    setAppTheme(savedTheme === 'dark' ? 'dark' : 'light');
    setAppLanguage(resolveStoredLanguage());
    setAppStartPage(resolveStoredStartPage());
    setAppDensity(resolveStoredDensity());
    setAppFontSize(resolveStoredFontSize());
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setError('');
        const [settingsRes, servicesRes, profileRes] = await Promise.all([
          authFetch('/api/settings'),
          authFetch('/api/services'),
          authFetch('/api/me/profile'),
        ]);
        const [data, servicesData, profileData] = await Promise.all([
          settingsRes.json(),
          servicesRes.json(),
          profileRes.json(),
        ]);

        if (!settingsRes.ok) {
          setError(data.error ?? 'Gat ekki sótt stillingar.');
          return;
        }

        if (servicesRes.ok) {
          setServices(servicesData.services ?? []);
        } else {
          setServiceError(servicesData.error ?? 'Gat ekki sótt þjónustulista.');
        }

        const settings = data as SettingsResponse;
        setTotpEnabled(settings.security.totpEnabled);
        setRemindersConfigured(settings.notifications.remindersConfigured);
        setSlotLength(settings.booking.slotLength);
        setBufferTime(settings.booking.bufferTime);
        setInitialSlotLength(settings.booking.slotLength);
        setInitialBufferTime(settings.booking.bufferTime);
        setBlockRedDays(settings.scheduling.blockRedDays);
        setInitialBlockRedDays(settings.scheduling.blockRedDays);
        const normalizedWorkingHours = normalizeWorkingHours(settings.scheduling.workingHours);
        setWorkingHours(normalizedWorkingHours);
        setInitialWorkingHours(normalizedWorkingHours);
        const loadedFlags = resolveManagedFlags(readFlags(settings.clinical?.customFlags));
        setCustomFlags(loadedFlags);
        setInitialCustomFlags(loadedFlags);
        const overviewVisibility = settings.clients?.overview ?? defaultClientOverviewVisibility;
        setClientOverviewVisibility(overviewVisibility);
        setInitialClientOverviewVisibility(overviewVisibility);

        if (profileRes.ok) {
          const normalizedProfile = normalizeUserProfile(profileData.profile);
          setUserProfile(normalizedProfile);
          setInitialUserProfile(normalizedProfile);
          setProfileError('');
        } else {
          setProfileError(profileData.error ?? 'Gat ekki sótt prófílupplýsingar.');
        }
      } catch {
        setError('Villa kom upp við að tengjast þjóni.');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!serviceError && !serviceSuccess) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setServiceError('');
      setServiceSuccess('');
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [serviceError, serviceSuccess]);

  useEffect(() => {
    if (!profileError && !profileSuccess) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setProfileError('');
      setProfileSuccess('');
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [profileError, profileSuccess]);

  const handleSaveBooking = async () => {
    if (!canSaveBooking) {
      return;
    }

    setSavingBooking(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: {
            slotLength,
            bufferTime,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Gat ekki vistað stillingar.');
        return;
      }

      setInitialSlotLength(slotLength);
      setInitialBufferTime(bufferTime);
      setSuccess('Stillingar vistaðar.');
    } catch {
      setError('Villa kom upp við vistun stillinga.');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleWorkingHourChange = (weekday: number, updates: Partial<WorkingHour>) => {
    setWorkingHours((current) =>
      current.map((item) => (item.weekday === weekday ? { ...item, ...updates } : item))
    );
  };

  const handleSaveScheduling = async () => {
    if (!canSaveScheduling) {
      return;
    }

    setSavingScheduling(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduling: {
            blockRedDays,
            workingHours,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Gat ekki vistað vinnutímastillingar.');
        return;
      }

      const normalizedWorkingHours = normalizeWorkingHours(data.scheduling?.workingHours);
      setInitialBlockRedDays(Boolean(data.scheduling?.blockRedDays));
      setBlockRedDays(Boolean(data.scheduling?.blockRedDays));
      setInitialWorkingHours(normalizedWorkingHours);
      setWorkingHours(normalizedWorkingHours);
      setSuccess('Vinnutímastillingar vistaðar.');
    } catch {
      setError('Villa kom upp við vistun vinnutímastillinga.');
    } finally {
      setSavingScheduling(false);
    }
  };

  const handleAddFlag = () => {
    setFlagError('');
    setFlagSuccess('');

    const normalized = normalizeFlagLabel(customFlagLabel);
    if (!normalized) {
      return;
    }

    if (normalized.length < 2 || normalized.length > 40) {
      setFlagError('Flagg þarf að vera 2-40 stafir.');
      return;
    }

    const normalizedKey = normalized.toLocaleLowerCase('is');

    const exists = customFlags.some(
      (item) =>
        item.label.toLocaleLowerCase('is') === normalizedKey &&
        item.label.toLocaleLowerCase('is') !== editingFlagLabel?.toLocaleLowerCase('is')
    );

    if (exists) {
      setFlagError('Þetta flagg er nú þegar til.');
      return;
    }

    const nextItem: CustomFlag = { label: normalized, icon: customFlagIcon };

    const next = editingFlagLabel
      ? customFlags.map((item) =>
          item.label.toLocaleLowerCase('is') === editingFlagLabel.toLocaleLowerCase('is')
            ? nextItem
            : item
        )
      : [...customFlags, nextItem];

    setCustomFlags(normalizeFlags(next));
    setCustomFlagLabel('');
    setCustomFlagIcon('ℹ️');
    setEditingFlagLabel(null);
  };

  const handleEditFlag = (flag: CustomFlag) => {
    setFlagError('');
    setFlagSuccess('');
    setCustomFlagLabel(flag.label);
    setCustomFlagIcon(flag.icon);
    setEditingFlagLabel(flag.label);
  };

  const handleCancelFlagEdit = () => {
    setCustomFlagLabel('');
    setCustomFlagIcon('ℹ️');
    setEditingFlagLabel(null);
  };

  const handleRemoveFlag = (flagToRemove: CustomFlag) => {
    setFlagError('');
    setFlagSuccess('');
    setCustomFlags((current) => current.filter((flag) => flag.label !== flagToRemove.label));

    if (draggingFlagLabel === flagToRemove.label) {
      setDraggingFlagLabel(null);
      setDragOverFlagLabel(null);
    }

    if (editingFlagLabel?.toLocaleLowerCase('is') === flagToRemove.label.toLocaleLowerCase('is')) {
      handleCancelFlagEdit();
    }
  };

  const handleSaveFlags = async () => {
    if (!canSaveFlags) {
      return;
    }

    setSavingFlags(true);
    setFlagError('');
    setFlagSuccess('');

    try {
      const res = await authFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinical: {
            customFlags: [...customFlags, { label: FLAGS_CONFIG_MARKER, icon: 'ℹ️' }],
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFlagError(data.error ?? 'Ekki tókst að vista flögg.');
        return;
      }

      await refreshFlags();
      setFlagSuccess('Flögg vistuð.');
      handleCancelFlagEdit();
    } catch {
      setFlagError('Villa kom upp við vistun flagga.');
    } finally {
      setSavingFlags(false);
    }
  };

  const refreshFlags = async (options?: { showSuccessMessage?: boolean }) => {
    const res = await authFetch('/api/settings');
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? 'Gat ekki sótt flögg.');
    }

    const flags = resolveManagedFlags(readFlags(data.clinical?.customFlags));
    setCustomFlags(flags);
    setInitialCustomFlags(flags);

    if (options?.showSuccessMessage) {
      setFlagSuccess('Flögg uppfærð.');
    }
  };

  const handleRefreshFlags = async () => {
    setRefreshingFlags(true);
    setFlagError('');
    setFlagSuccess('');

    try {
      await refreshFlags({ showSuccessMessage: true });
    } catch {
      setFlagError('Villa kom upp við að sækja flögg.');
    } finally {
      setRefreshingFlags(false);
    }
  };

  const handleSaveClientOverview = async () => {
    if (!canSaveClientOverview) {
      return;
    }

    setSavingClientOverview(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: {
            overview: clientOverviewVisibility,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Gat ekki vistað skjólstæðingastillingar.');
        return;
      }

      const overviewVisibility = data.clients?.overview ?? clientOverviewVisibility;
      setClientOverviewVisibility(overviewVisibility);
      setInitialClientOverviewVisibility(overviewVisibility);
      setSuccess('Skjólstæðingastillingar vistaðar.');
    } catch {
      setError('Villa kom upp við vistun skjólstæðingastillinga.');
    } finally {
      setSavingClientOverview(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Fylltu út alla lykilorðareiti.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Nýtt lykilorð þarf að vera minnst 8 stafir.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Nýtt lykilorð og staðfesting passa ekki saman.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authFetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? 'Gat ekki endurstillt lykilorð.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Lykilorð hefur verið uppfært.');
    } catch {
      setPasswordError('Villa kom upp við uppfærslu lykilorðs.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    await logoutSession();
    router.replace('/login?loggedOut=1');
  };

  const handleUserProfileChange = (field: keyof UserProfile, value: string) => {
    setUserProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveUserProfile = async () => {
    if (!canSaveUserProfile) {
      return;
    }

    setSavingUserProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await authFetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: userProfile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error ?? 'Gat ekki vistað prófíl.');
        return;
      }

      const normalized = normalizeUserProfile(data.profile);
      setUserProfile(normalized);
      setInitialUserProfile(normalized);
      setProfileSuccess('Prófíll og reikningsupplýsingar vistaðar.');
    } catch {
      setProfileError('Villa kom upp við vistun prófíls.');
    } finally {
      setSavingUserProfile(false);
    }
  };

  const handleThemeChange = (theme: AppTheme) => {
    setAppTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  };

  const handleLanguageChange = (language: AppLanguage) => {
    setAppLanguage(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    applyLanguage(language);
  };

  const handleStartPageChange = (startPage: AppStartPage) => {
    setAppStartPage(startPage);
    window.localStorage.setItem(START_PAGE_STORAGE_KEY, startPage);
  };

  const handleDensityChange = (density: AppDensity) => {
    setAppDensity(density);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
    applyDensity(density);
  };

  const handleFontSizeChange = (fontSize: AppFontSize) => {
    setAppFontSize(fontSize);
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
    applyFontSize(fontSize);
  };

  const handleResetGeneralDefaults = () => {
    setAppTheme(DEFAULT_THEME);
    setAppLanguage(DEFAULT_LANGUAGE);
    setAppStartPage(DEFAULT_START_PAGE);
    setAppDensity(DEFAULT_DENSITY);
    setAppFontSize(DEFAULT_FONT_SIZE);

    window.localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE);
    window.localStorage.setItem(START_PAGE_STORAGE_KEY, DEFAULT_START_PAGE);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, DEFAULT_DENSITY);
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, DEFAULT_FONT_SIZE);

    applyTheme(DEFAULT_THEME);
    applyLanguage(DEFAULT_LANGUAGE);
    applyDensity(DEFAULT_DENSITY);
    applyFontSize(DEFAULT_FONT_SIZE);
  };

  const moveFlag = (items: CustomFlag[], sourceLabel: string, targetLabel: string): CustomFlag[] => {
    if (!sourceLabel || !targetLabel || sourceLabel === targetLabel) {
      return items;
    }

    const sourceIndex = items.findIndex((item) => item.label === sourceLabel);
    const targetIndex = items.findIndex((item) => item.label === targetLabel);
    if (sourceIndex === -1 || targetIndex === -1) {
      return items;
    }

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const handleFlagDrop = (targetLabel: string, sourceLabel?: string) => {
    const draggedLabel = sourceLabel ?? draggingFlagLabel;
    if (!draggedLabel || draggedLabel === targetLabel) {
      setDragOverFlagLabel(null);
      return;
    }

    setCustomFlags((current) => moveFlag(current, draggedLabel, targetLabel));
    setDraggingFlagLabel(null);
    setDragOverFlagLabel(null);
    setFlagError('');
    setFlagSuccess('Röðun uppfærð. Smelltu á „Vista flögg“ til að staðfesta.');
  };

  const handleStartTotpSetup = async () => {
    setTotpLoading(true);
    setTotpError('');
    setTotpSuccess('');

    try {
      const res = await authFetch('/api/auth/totp', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setTotpError(data.error ?? 'Gat ekki hafið 2FA uppsetningu.');
        return;
      }

      setTotpSecret(data.secret ?? '');
      setTotpQrCode(data.qrCode ?? '');
      setTotpSuccess('Skannaðu QR kóðann og staðfestu með 6 stafa kóða.');
    } catch {
      setTotpError('Villa kom upp við að hefja 2FA uppsetningu.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!totpToken.trim()) {
      setTotpError('Sláðu inn 6 stafa kóða.');
      return;
    }

    setTotpLoading(true);
    setTotpError('');
    setTotpSuccess('');

    try {
      const res = await authFetch('/api/auth/totp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totpToken: totpToken.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTotpError(data.error ?? 'Tókst ekki að staðfesta 2FA.');
        return;
      }

      setTotpEnabled(true);
      setTotpSecret('');
      setTotpQrCode('');
      setTotpToken('');
      setTotpSuccess('2FA hefur verið virkjað.');
    } catch {
      setTotpError('Villa kom upp við staðfestingu á 2FA.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!totpToken.trim()) {
      setTotpError('Sláðu inn 6 stafa kóða til að slökkva á 2FA.');
      return;
    }

    setTotpLoading(true);
    setTotpError('');
    setTotpSuccess('');

    try {
      const res = await authFetch('/api/auth/totp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totpToken: totpToken.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTotpError(data.error ?? 'Tókst ekki að slökkva á 2FA.');
        return;
      }

      setTotpEnabled(false);
      setShowDisableTotp(false);
      setTotpToken('');
      setTotpSuccess('2FA hefur verið gert óvirkt.');
    } catch {
      setTotpError('Villa kom upp við að slökkva á 2FA.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setServiceDuration(service.durationMinutes);
    setServiceError('');
    setServiceSuccess('');
  };

  const handleResetServiceForm = () => {
    setEditingServiceId(null);
    setServiceName('');
    setServiceDuration(30);
    setServiceError('');
    setServiceSuccess('');
  };

  const handleSaveService = async (event: React.FormEvent) => {
    event.preventDefault();
    setServiceError('');
    setServiceSuccess('');

    const trimmedName = serviceName.trim();
    if (!trimmedName) {
      setServiceError('Nafn þjónustu er skylda.');
      return;
    }

    if (!Number.isInteger(serviceDuration) || serviceDuration < 5 || serviceDuration > 240) {
      setServiceError('Lengd þjónustu þarf að vera heiltala á bilinu 5-240 mín.');
      return;
    }

    const isEditing = Boolean(editingServiceId);
    const endpoint = isEditing ? `/api/services/${editingServiceId}` : '/api/services';
    const method = isEditing ? 'PATCH' : 'POST';

    setServiceSaving(true);
    try {
      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          durationMinutes: serviceDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setServiceError(data.error ?? 'Ekki tókst að vista þjónustu.');
        return;
      }

      const savedService = data.service as Service;
      setServices((current) => {
        if (isEditing) {
          return current.map((item) => (item.id === savedService.id ? { ...item, ...savedService } : item));
        }
        return [...current, savedService];
      });

      setServiceName('');
      setServiceDuration(30);
      setEditingServiceId(null);
      setServiceSuccess(isEditing ? 'Þjónusta uppfærð.' : 'Þjónusta stofnuð.');
    } catch {
      setServiceError('Villa kom upp við vistun þjónustu.');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = async (service: Service) => {
    const confirmed = window.confirm(`Eyða þjónustu „${service.name}“?`);
    if (!confirmed) {
      return;
    }

    setServiceSaving(true);
    setServiceError('');
    setServiceSuccess('');
    try {
      const res = await authFetch(`/api/services/${service.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setServiceError(data.error ?? 'Ekki tókst að eyða þjónustu.');
        return;
      }

      setServices((current) => current.filter((item) => item.id !== service.id));
      if (editingServiceId === service.id) {
        handleResetServiceForm();
      }
      setServiceSuccess('Þjónustu eytt.');
    } catch {
      setServiceError('Villa kom upp við að eyða þjónustu.');
    } finally {
      setServiceSaving(false);
    }
  };

  const refreshServices = async (options?: { showSuccessMessage?: boolean }) => {
    const res = await authFetch('/api/services');
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? 'Gat ekki sótt þjónustulista.');
    }

    setServices(data.services ?? []);

    if (options?.showSuccessMessage) {
      setServiceSuccess('Þjónustulisti uppfærður.');
    }
  };

  const handleRefreshServices = async () => {
    setServiceRefreshing(true);
    setServiceError('');
    setServiceSuccess('');

    try {
      await refreshServices({ showSuccessMessage: true });
    } catch {
      setServiceError('Villa kom upp við að sækja þjónustulista.');
    } finally {
      setServiceRefreshing(false);
    }
  };

  const moveService = (items: Service[], sourceId: string, targetId: string): Service[] => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return items;
    }

    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) {
      return items;
    }

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const persistServiceOrder = async (ordered: Service[]) => {
    const orderedIds = ordered.map((service) => service.id);
    const res = await authFetch('/api/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? 'Ekki tókst að vista röðun.');
    }

    const orderedServices = data.services as Service[] | undefined;
    if (orderedServices) {
      setServices(orderedServices);
    }
  };

  const handleServiceDrop = async (targetServiceId: string) => {
    if (!draggingServiceId || draggingServiceId === targetServiceId) {
      setDragOverServiceId(null);
      return;
    }

    const previous = services;
    const reordered = moveService(previous, draggingServiceId, targetServiceId);
    setServices(reordered);
    setDraggingServiceId(null);
    setDragOverServiceId(null);
    setServiceSaving(true);
    setServiceError('');
    setServiceSuccess('');

    try {
      await persistServiceOrder(reordered);
      await refreshServices();
      setServiceSuccess('Röðun þjónusta vistuð.');
    } catch {
      setServices(previous);
      setServiceError('Villa kom upp við vistun röðunar.');
    } finally {
      setServiceSaving(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'services') {
      setOpenSection('calendar');
      setOpenSubSection('calendar-services');
      return;
    }

    if (hash === 'flags') {
      setOpenSection('clients');
      setOpenSubSection('clients-flags');
    }
  }, []);

  const handleSectionToggle = (section: SettingsSectionKey) => {
    setOpenSection((current) => {
      const nextSection = current === section ? null : section;
      setOpenSubSection(null);
      return nextSection;
    });
  };

  const handleSubSectionToggle = (subSection: SettingsSubSectionKey) => {
    setOpenSubSection((current) => (current === subSection ? null : subSection));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stillingar</h1>
          <p className="text-gray-600 mt-1">Grunnstillingar fyrir öryggi og bókunarkerfi.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</div>
        )}

        <SettingsSection
          title="Almennar stillingar"
          sectionKey="general"
          openSection={openSection}
          onToggle={handleSectionToggle}
          className="order-1"
        >
          <div className="space-y-4">
            <SettingsSubSection
              title="Þema"
              subSectionKey="general-theme"
              openSubSection={openSubSection}
              onToggle={handleSubSectionToggle}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Veldu útlit á kerfinu.</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={appTheme === 'light' ? 'primary' : 'outline'}
                    onClick={() => handleThemeChange('light')}
                  >
                    Ljóst þema
                  </Button>
                  <Button
                    type="button"
                    variant={appTheme === 'dark' ? 'primary' : 'outline'}
                    onClick={() => handleThemeChange('dark')}
                  >
                    Dökkt þema
                  </Button>
                </div>
              </div>
            </SettingsSubSection>

            <SettingsSubSection
              title="Tungumál"
              subSectionKey="general-language"
              openSubSection={openSubSection}
              onToggle={handleSubSectionToggle}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Veldu tungumál viðmótsins.</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={appLanguage === 'is' ? 'primary' : 'outline'}
                    onClick={() => handleLanguageChange('is')}
                  >
                    Íslenska
                  </Button>
                  <Button
                    type="button"
                    variant={appLanguage === 'en' ? 'primary' : 'outline'}
                    onClick={() => handleLanguageChange('en')}
                  >
                    English
                  </Button>
                </div>
              </div>
            </SettingsSubSection>

            <SettingsSubSection
              title="Sjálfgefið upphafssvæði"
              subSectionKey="general-start-page"
              openSubSection={openSubSection}
              onToggle={handleSubSectionToggle}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Hvert viltu fara sjálfgefið eftir innskráningu?</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={appStartPage === '/appointments' ? 'primary' : 'outline'}
                    onClick={() => handleStartPageChange('/appointments')}
                  >
                    Dagatal
                  </Button>
                  <Button
                    type="button"
                    variant={appStartPage === '/clients' ? 'primary' : 'outline'}
                    onClick={() => handleStartPageChange('/clients')}
                  >
                    Skjólstæðingar
                  </Button>
                  <Button
                    type="button"
                    variant={appStartPage === '/dashboard' ? 'primary' : 'outline'}
                    onClick={() => handleStartPageChange('/dashboard')}
                  >
                    Dashboard
                  </Button>
                </div>
              </div>
            </SettingsSubSection>

            <SettingsSubSection
              title="Þéttleiki viðmóts"
              subSectionKey="general-density"
              openSubSection={openSubSection}
              onToggle={handleSubSectionToggle}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Stilltu bil í listum og töflum.</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={appDensity === 'comfortable' ? 'primary' : 'outline'}
                    onClick={() => handleDensityChange('comfortable')}
                  >
                    Comfortable
                  </Button>
                  <Button
                    type="button"
                    variant={appDensity === 'compact' ? 'primary' : 'outline'}
                    onClick={() => handleDensityChange('compact')}
                  >
                    Compact
                  </Button>
                </div>
              </div>
            </SettingsSubSection>

            <SettingsSubSection
              title="Leturstærð"
              subSectionKey="general-font-size"
              openSubSection={openSubSection}
              onToggle={handleSubSectionToggle}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Veldu heildar leturstærð í kerfinu.</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={appFontSize === 'small' ? 'primary' : 'outline'}
                    onClick={() => handleFontSizeChange('small')}
                  >
                    Lítið
                  </Button>
                  <Button
                    type="button"
                    variant={appFontSize === 'medium' ? 'primary' : 'outline'}
                    onClick={() => handleFontSizeChange('medium')}
                  >
                    Miðlungs
                  </Button>
                  <Button
                    type="button"
                    variant={appFontSize === 'large' ? 'primary' : 'outline'}
                    onClick={() => handleFontSizeChange('large')}
                  >
                    Stórt
                  </Button>
                </div>
              </div>
            </SettingsSubSection>

            <SettingsSubSection
              title="Prófíll og reikningar"
              subSectionKey="general-profile-billing"
              openSubSection={openSubSection}
              onToggle={handleSubSectionToggle}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Skráðu upplýsingar sem nýtast fyrir útgáfu reikninga seinna.
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={userProfile.fullName}
                    onChange={(e) => handleUserProfileChange('fullName', e.target.value)}
                    placeholder="Fullt nafn"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.phone}
                    onChange={(e) => handleUserProfileChange('phone', e.target.value)}
                    placeholder="Símanúmer"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.companyName}
                    onChange={(e) => handleUserProfileChange('companyName', e.target.value)}
                    placeholder="Fyrirtæki / starfsheiti"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.kennitala}
                    onChange={(e) => handleUserProfileChange('kennitala', e.target.value)}
                    placeholder="Kennitala"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.streetAddress}
                    onChange={(e) => handleUserProfileChange('streetAddress', e.target.value)}
                    placeholder="Heimilisfang"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 md:col-span-2"
                  />
                  <input
                    type="text"
                    value={userProfile.addressLine2}
                    onChange={(e) => handleUserProfileChange('addressLine2', e.target.value)}
                    placeholder="Auka heimilisfang (hæð/íbúð)"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 md:col-span-2"
                  />
                  <input
                    type="text"
                    value={userProfile.postalCode}
                    onChange={(e) => handleUserProfileChange('postalCode', e.target.value)}
                    placeholder="Póstnúmer"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.city}
                    onChange={(e) => handleUserProfileChange('city', e.target.value)}
                    placeholder="Bær"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.country}
                    onChange={(e) => handleUserProfileChange('country', e.target.value)}
                    placeholder="Land"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="email"
                    value={userProfile.invoiceEmail}
                    onChange={(e) => handleUserProfileChange('invoiceEmail', e.target.value)}
                    placeholder="Netfang fyrir reikning"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.bankAccount}
                    onChange={(e) => handleUserProfileChange('bankAccount', e.target.value)}
                    placeholder="Reikningsnúmer"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.iban}
                    onChange={(e) => handleUserProfileChange('iban', e.target.value)}
                    placeholder="IBAN"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.swiftCode}
                    onChange={(e) => handleUserProfileChange('swiftCode', e.target.value)}
                    placeholder="SWIFT/BIC"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={userProfile.vatNumber}
                    onChange={(e) => handleUserProfileChange('vatNumber', e.target.value)}
                    placeholder="VSK númer"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 md:col-span-2"
                  />
                  <textarea
                    value={userProfile.invoiceNotes}
                    onChange={(e) => handleUserProfileChange('invoiceNotes', e.target.value)}
                    placeholder="Athugasemdir á reikningi"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 md:col-span-2"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">Reikningaforskoðun</p>
                  <p className="mt-1 text-xs text-gray-600">Svona myndu helstu sendandaupplýsingar birtast á reikningi.</p>

                  {(() => {
                    const missingFields = [
                      !userProfile.fullName.trim() ? 'Fullt nafn' : null,
                      !userProfile.kennitala.trim() ? 'Kennitala' : null,
                      !userProfile.invoiceEmail.trim() ? 'Reikningsnetfang' : null,
                      !userProfile.streetAddress.trim() ? 'Heimilisfang' : null,
                      !userProfile.postalCode.trim() ? 'Póstnúmer' : null,
                      !userProfile.city.trim() ? 'Bær' : null,
                      !userProfile.bankAccount.trim() ? 'Reikningsnúmer' : null,
                    ].filter(Boolean) as string[];

                    if (missingFields.length === 0) {
                      return (
                        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                          Reikningsupplýsingar virðast nægjanlegar fyrir næsta skref.
                        </div>
                      );
                    }

                    return (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Vantar lykilupplýsingar fyrir reikninga: {missingFields.join(', ')}.
                      </div>
                    );
                  })()}

                  <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-gray-800 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">Sendandi</p>
                      <p>{userProfile.fullName || '—'}</p>
                      <p>{userProfile.companyName || '—'}</p>
                      <p>{userProfile.streetAddress || '—'}</p>
                      {userProfile.addressLine2 ? <p>{userProfile.addressLine2}</p> : null}
                      <p>
                        {(userProfile.postalCode || '').trim()} {(userProfile.city || '').trim()}
                        {!userProfile.postalCode && !userProfile.city ? '—' : ''}
                      </p>
                      <p>{userProfile.country || '—'}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">Greiðsluupplýsingar</p>
                      <p>Reikningsnetfang: {userProfile.invoiceEmail || '—'}</p>
                      <p>Sími: {userProfile.phone || '—'}</p>
                      <p>Kennitala: {userProfile.kennitala || '—'}</p>
                      <p>Reikningsnúmer: {userProfile.bankAccount || '—'}</p>
                      <p>IBAN: {userProfile.iban || '—'}</p>
                      <p>SWIFT/BIC: {userProfile.swiftCode || '—'}</p>
                      <p>VSK nr.: {userProfile.vatNumber || '—'}</p>
                    </div>
                  </div>

                  {userProfile.invoiceNotes ? (
                    <div className="mt-3 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">Athugasemd á reikningi</p>
                      <p className="mt-1 whitespace-pre-wrap">{userProfile.invoiceNotes}</p>
                    </div>
                  ) : null}
                </div>

                {profileError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>
                ) : null}

                {profileSuccess ? (
                  <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{profileSuccess}</div>
                ) : null}

                <div className="flex justify-end">
                  <Button type="button" onClick={handleSaveUserProfile} disabled={!canSaveUserProfile}>
                    {savingUserProfile ? 'Vista...' : 'Vista prófíl og reikningsupplýsingar'}
                  </Button>
                </div>
              </div>
            </SettingsSubSection>

            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={handleResetGeneralDefaults}>
                Endurstilla almennar stillingar
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Öryggi"
          sectionKey="security"
          openSection={openSection}
          onToggle={handleSectionToggle}
          className="order-4"
        >
          {loading ? (
            <p className="text-gray-600">Hleður...</p>
          ) : (
            <div className="space-y-4">
              <SettingsSubSection
                title="2FA"
                subSectionKey="security-2fa"
                openSubSection={openSubSection}
                onToggle={handleSubSectionToggle}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                    <div>
                      <p className="font-medium text-gray-900">2FA (TOTP)</p>
                      <p className="text-sm text-gray-600">Staða: {totpEnabled ? 'Virk' : 'Óvirk'}</p>
                    </div>
                    {!totpEnabled && (
                      <Button onClick={handleStartTotpSetup} disabled={totpLoading}>
                        {totpLoading ? 'Hleð...' : 'Setja upp 2FA'}
                      </Button>
                    )}
                    {totpEnabled && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDisableTotp((current) => !current);
                          setTotpError('');
                          setTotpSuccess('');
                          setTotpToken('');
                        }}
                        disabled={totpLoading}
                      >
                        Endurstilla 2FA
                      </Button>
                    )}
                  </div>

                  {totpError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{totpError}</div>
                  )}

                  {totpSuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{totpSuccess}</div>
                  )}

                  {!totpEnabled && totpQrCode && (
                    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <p className="text-sm text-gray-700">Skannaðu kóðann í authenticator appi og sláðu inn staðfestingarkóðann.</p>
                      <Image
                        src={totpQrCode}
                        alt="TOTP QR"
                        width={192}
                        height={192}
                        unoptimized
                        className="w-48 h-48 border border-gray-200 rounded"
                      />
                      <p className="text-xs text-gray-500 break-all">Secret: {totpSecret}</p>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={totpToken}
                          onChange={(e) => setTotpToken(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="123456"
                        />
                        <Button onClick={handleVerifyTotp} disabled={totpLoading || totpToken.trim().length < 6}>
                          {totpLoading ? 'Staðfesti...' : 'Staðfesta'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {totpEnabled && showDisableTotp && (
                    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <p className="text-sm text-gray-700">Sláðu inn 6 stafa kóða til að endurstilla 2FA. Eftir þetta geturðu sett upp nýjan authenticator.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={totpToken}
                          onChange={(e) => setTotpToken(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="123456"
                        />
                        <Button onClick={handleDisableTotp} disabled={totpLoading || totpToken.trim().length < 6}>
                          {totpLoading ? 'Endurstilli...' : 'Endurstilla 2FA'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SettingsSubSection>

              <SettingsSubSection
                title="Endurstilla lykilorð"
                subSectionKey="security-password"
                openSubSection={openSubSection}
                onToggle={handleSubSectionToggle}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Núverandi lykilorð"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nýtt lykilorð"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Staðfesta nýtt lykilorð"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                    />
                  </div>
                  {passwordError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</div>
                  ) : null}
                  {passwordSuccess ? (
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{passwordSuccess}</div>
                  ) : null}
                  <div className="flex justify-end">
                    <Button type="button" onClick={handleSavePassword} disabled={savingPassword}>
                      {savingPassword ? 'Vista...' : 'Vista nýtt lykilorð'}
                    </Button>
                  </div>
                </div>
              </SettingsSubSection>

              <SettingsSubSection
                title="Tilkynningar"
                subSectionKey="security-notifications"
                openSubSection={openSubSection}
                onToggle={handleSubSectionToggle}
              >
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-900">Tilkynningar</p>
                    <p className="mt-1 text-sm text-gray-700">Staða áminninga: {remindersConfigured ? 'Configured' : 'Missing'}</p>
                    <p className="mt-2 text-xs text-gray-500">Read-only í MVP.</p>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-900">Útskráning</p>
                    <p className="mt-1 text-sm text-gray-700">Skráðu þig út af þessu tæki.</p>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="outline" onClick={handleLogout} disabled={loggingOut}>
                        {loggingOut ? 'Skrái út...' : 'Útskrá'}
                      </Button>
                    </div>
                  </div>
                </div>
              </SettingsSubSection>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title="Dagatal"
          sectionKey="calendar"
          openSection={openSection}
          onToggle={handleSectionToggle}
          className="order-2"
        >
          {loading ? (
            <p className="text-gray-600">Hleður...</p>
          ) : (
            <div className="space-y-4">
              <SettingsSubSection
                title="Bil í dagatali"
                subSectionKey="calendar-slots"
                openSubSection={openSubSection}
                onToggle={handleSubSectionToggle}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="slotLength" className="mb-1 block text-sm font-medium text-gray-700">
                        Tímabil (mín)
                      </label>
                      <select
                        id="slotLength"
                        value={slotLength}
                        onChange={(e) => setSlotLength(Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        {[15, 30, 60].map((value) => (
                          <option key={value} value={value}>{value} mín</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="bufferTime" className="mb-1 block text-sm font-medium text-gray-700">
                        Bil milli tíma (mín)
                      </label>
                      <input
                        id="bufferTime"
                        type="number"
                        min={0}
                        max={60}
                        value={bufferTime}
                        onChange={(e) => setBufferTime(Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {bookingValidationMessage && <p className="text-sm text-red-700">{bookingValidationMessage}</p>}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveBooking} disabled={!canSaveBooking}>
                      {savingBooking ? 'Vista...' : 'Vista breytingar'}
                    </Button>
                  </div>
                </div>
              </SettingsSubSection>

              <SettingsSubSection
                title="Stilla vinnutíma"
                subSectionKey="calendar-working-hours"
                openSubSection={openSubSection}
                onToggle={handleSubSectionToggle}
              >
                <div className="space-y-4">
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <input
                      type="checkbox"
                      checked={blockRedDays}
                      onChange={(e) => setBlockRedDays(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-800">Blokka alla rauða daga (lögbundna frídaga á Íslandi)</span>
                  </label>

                  <div className="space-y-3">
                    {weekdayDisplayOrder.map((weekday) => {
                      const day = workingHours.find((item) => item.weekday === weekday);
                      if (!day) {
                        return null;
                      }

                      return (
                        <div key={weekday} className="rounded-lg border border-gray-200 p-3">
                          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-4">
                            <p className="font-medium text-gray-900">{weekdayLabels[weekday]}</p>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={day.enabled}
                                onChange={(e) => handleWorkingHourChange(weekday, { enabled: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              Virkur dagur
                            </label>

                            <input
                              type="time"
                              value={day.startTime}
                              onChange={(e) => handleWorkingHourChange(weekday, { startTime: e.target.value })}
                              disabled={!day.enabled}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />

                            <input
                              type="time"
                              value={day.endTime}
                              onChange={(e) => handleWorkingHourChange(weekday, { endTime: e.target.value })}
                              disabled={!day.enabled}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!workingHoursValid && (
                    <p className="text-sm text-red-700">Tímasetningar eru ógildar. Fyrir virka daga þarf upphafstími að vera fyrr en lokatími.</p>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveScheduling} disabled={!canSaveScheduling}>
                      {savingScheduling ? 'Vista...' : 'Vista vinnutíma'}
                    </Button>
                  </div>
                </div>
              </SettingsSubSection>

              <SettingsSubSection
                title="Þjónustur"
                subSectionKey="calendar-services"
                openSubSection={openSubSection}
                onToggle={handleSubSectionToggle}
              >
                <div id="services" className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">Þjónustur</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleRefreshServices} disabled={serviceRefreshing || serviceSaving}>
                      {serviceRefreshing ? 'Sæki...' : 'Uppfæra lista'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Dragðu þjónustur upp og niður til að velja röð í bókunarlista.</p>
                    {services.length === 0 ? (
                      <p className="text-sm text-gray-600">Engar þjónustur skráðar.</p>
                    ) : (
                      services.map((service) => (
                        <div
                          key={service.id}
                          draggable={!serviceSaving}
                          onDragStart={() => setDraggingServiceId(service.id)}
                          onDragEnd={() => {
                            setDraggingServiceId(null);
                            setDragOverServiceId(null);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (dragOverServiceId !== service.id) {
                              setDragOverServiceId(service.id);
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            void handleServiceDrop(service.id);
                          }}
                          className={`rounded-lg border p-3 ${dragOverServiceId === service.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="cursor-grab text-gray-400" aria-hidden>
                                ⋮⋮
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">{service.name}</p>
                                <p className="text-sm text-gray-600">{service.durationMinutes} mínútur</p>
                                {service.isDefault ? <p className="text-xs text-gray-500">Sjálfgefin þjónusta</p> : null}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditService(service)}>
                                Breyta
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleDeleteService(service)}>
                                Eyða
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSaveService} className="space-y-3 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700">{editingServiceId ? 'Breyta þjónustu' : 'Stofna þjónustu'}</p>

                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Heiti þjónustu"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
                    />

                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(Number(e.target.value))}
                      placeholder="Lengd í mínútum"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
                    />

                    {serviceError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serviceError}</div>
                    ) : null}

                    {serviceSuccess ? (
                      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{serviceSuccess}</div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="submit" disabled={serviceSaving}>
                        {serviceSaving ? 'Vista...' : editingServiceId ? 'Vista breytingar' : 'Stofna þjónustu'}
                      </Button>
                      {editingServiceId ? (
                        <Button type="button" variant="outline" onClick={handleResetServiceForm}>
                          Hætta við
                        </Button>
                      ) : null}
                    </div>
                  </form>
                </div>
              </SettingsSubSection>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title="Skjólstæðingar"
          sectionKey="clients"
          openSection={openSection}
          onToggle={handleSectionToggle}
          className="order-3"
        >
            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : (
              <div className="space-y-4">
                <SettingsSubSection
                  title="Skjólstæðingayfirlit - sýnileiki í haus"
                  subSectionKey="clients-overview"
                  openSubSection={openSubSection}
                  onToggle={handleSubSectionToggle}
                >
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm text-gray-800">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clientOverviewVisibility.showKennitala}
                          onChange={(event) =>
                            setClientOverviewVisibility((current) => ({ ...current, showKennitala: event.target.checked }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Sýna kennitölu
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clientOverviewVisibility.showPhone}
                          onChange={(event) =>
                            setClientOverviewVisibility((current) => ({ ...current, showPhone: event.target.checked }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Sýna símanúmer
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clientOverviewVisibility.showFlags}
                          onChange={(event) =>
                            setClientOverviewVisibility((current) => ({ ...current, showFlags: event.target.checked }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Sýna flögg
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" onClick={handleSaveClientOverview} disabled={!canSaveClientOverview}>
                        {savingClientOverview ? 'Vista...' : 'Vista sýnileika'}
                      </Button>
                    </div>
                  </div>
                </SettingsSubSection>

                <SettingsSubSection
                  title="Flögg"
                  subSectionKey="clients-flags"
                  openSubSection={openSubSection}
                  onToggle={handleSubSectionToggle}
                >
                  <div id="flags" className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">Flögg</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshFlags}
                        disabled={refreshingFlags || savingFlags}
                      >
                        {refreshingFlags ? 'Sæki...' : 'Uppfæra lista'}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500">Öll flögg eru í sama lista og má breyta, eyða og raða.</p>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={customFlagLabel}
                        onChange={(e) => setCustomFlagLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFlag();
                          }
                        }}
                        placeholder="Nýtt flagg (t.d. Blóðþrýstingur)"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
                      />
                      <select
                        value={customFlagIcon}
                        onChange={(e) => setCustomFlagIcon(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        aria-label="Velja icon"
                      >
                        {clinicalFlagIconOptions.map((icon) => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" onClick={handleAddFlag}>
                        {editingFlagLabel ? 'Vista breytingar' : 'Bæta við'}
                      </Button>
                      {editingFlagLabel ? (
                        <Button type="button" variant="secondary" onClick={handleCancelFlagEdit}>
                          Hætta við
                        </Button>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      {customFlags.map((flag) => (
                        <div
                          key={flag.label}
                          draggable={!savingFlags && !refreshingFlags}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', flag.label);
                            setDraggingFlagLabel(flag.label);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (dragOverFlagLabel !== flag.label) {
                              setDragOverFlagLabel(flag.label);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverFlagLabel === flag.label) {
                              setDragOverFlagLabel(null);
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const droppedLabel = event.dataTransfer.getData('text/plain');
                            handleFlagDrop(flag.label, droppedLabel || undefined);
                          }}
                          onDragEnd={() => {
                            setDraggingFlagLabel(null);
                            setDragOverFlagLabel(null);
                          }}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                            dragOverFlagLabel === flag.label ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="cursor-grab text-gray-400" aria-hidden>
                              ⋮⋮
                            </span>
                            <p className="text-sm text-gray-800">{flag.icon} {flag.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => handleEditFlag(flag)}>
                              Breyta
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => handleRemoveFlag(flag)}>
                              Fjarlægja
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {customFlags.length > 0 ? (
                      <p className="text-xs text-gray-500">Dragðu flögg upp eða niður til að breyta röðun.</p>
                    ) : null}

                    {flagError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {flagError}
                      </div>
                    ) : null}

                    {flagSuccess ? (
                      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        {flagSuccess}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button onClick={handleSaveFlags} disabled={!canSaveFlags}>
                        {savingFlags ? 'Vista...' : 'Vista flögg'}
                      </Button>
                    </div>
                  </div>
                </SettingsSubSection>
              </div>
            )}
        </SettingsSection>
      </main>
    </div>
  );
}
