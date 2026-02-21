function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function firstMondayInAugust(year: number): Date {
  const date = new Date(year, 7, 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function firstThursdayAfterApril18(year: number): Date {
  const date = new Date(year, 3, 19);
  while (date.getDay() !== 4) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getIcelandicPublicHolidayKeys(year: number): Set<string> {
  const easterSunday = getEasterSunday(year);
  const fixedDates = [
    new Date(year, 0, 1),
    new Date(year, 4, 1),
    new Date(year, 5, 17),
    new Date(year, 11, 25),
    new Date(year, 11, 26),
  ];

  const movableDates = [
    addDays(easterSunday, -3),
    addDays(easterSunday, -2),
    addDays(easterSunday, 0),
    addDays(easterSunday, 1),
    addDays(easterSunday, 39),
    addDays(easterSunday, 49),
    addDays(easterSunday, 50),
    firstThursdayAfterApril18(year),
    firstMondayInAugust(year),
  ];

  return new Set([...fixedDates, ...movableDates].map(toDayKey));
}

export function isIcelandicPublicHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidayKeys = getIcelandicPublicHolidayKeys(year);
  return holidayKeys.has(toDayKey(date));
}
