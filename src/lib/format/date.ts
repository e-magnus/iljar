const weekdayLong = [
  'Sunnudagur',
  'Mánudagur',
  'Þriðjudagur',
  'Miðvikudagur',
  'Fimmtudagur',
  'Föstudagur',
  'Laugardagur',
] as const;

const weekdayShort = ['Sun', 'Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau'] as const;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function getIcelandicWeekday(value: Date | string, short = false): string {
  const date = toDate(value);
  const weekdayIndex = date.getDay();
  return short ? weekdayShort[weekdayIndex] : weekdayLong[weekdayIndex];
}

export function formatDDMM(value: Date | string): string {
  const date = toDate(value);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}

export function formatDDMMYY(value: Date | string): string {
  const date = toDate(value);
  return `${formatDDMM(date)}/${String(date.getFullYear()).slice(-2)}`;
}

export function formatDDMMYYYY(value: Date | string): string {
  const date = toDate(value);
  return `${formatDDMM(date)}/${date.getFullYear()}`;
}

export function formatIcelandicDayLabel(value: Date | string): string {
  const date = toDate(value);
  return `${getIcelandicWeekday(date)} ${formatDDMM(date)}`;
}

export function formatIcelandicDayLabelShort(value: Date | string): string {
  const date = toDate(value);
  return `${getIcelandicWeekday(date, true)} ${formatDDMM(date)}`;
}

export function formatTimeHHMM(value: Date | string): string {
  return new Intl.DateTimeFormat('is-IS', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(toDate(value));
}

export function formatDateTimeDDMMYYYYHHMM(value: Date | string): string {
  const date = toDate(value);
  return `${formatDDMMYYYY(date)} ${formatTimeHHMM(date)}`;
}
