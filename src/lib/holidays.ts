export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
}

const PUBLIC_HOLIDAYS_LIST: Holiday[] = [
  // 2025 Holidays
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-03-21', name: "Independence Day" },
  { date: '2025-04-18', name: "Good Friday" },
  { date: '2025-04-21', name: "Easter Monday" },
  { date: '2025-05-01', name: "Workers' Day" },
  { date: '2025-05-04', name: "Cassinga Day" },
  { date: '2025-05-25', name: "Africa Day" },
  { date: '2025-05-29', name: "Ascension Day" },
  { date: '2025-05-28', name: "Genocide Remembrance Day" },
  { date: '2025-08-26', name: "Heroes' Day" },
  { date: '2025-12-10', name: "Human Rights Day" },
  { date: '2025-12-25', name: "Christmas Day" },
  { date: '2025-12-26', name: "Family Day" },

  // 2026 Holidays
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-03-21', name: "Independence Day" },
  { date: '2026-04-03', name: "Good Friday" },
  { date: '2026-04-06', name: "Easter Monday" },
  { date: '2026-05-01', name: "Workers' Day" },
  { date: '2026-05-04', name: "Cassinga Day" },
  { date: '2026-05-14', name: "Ascension Day" },
  { date: '2026-05-25', name: "Africa Day" },
  { date: '2026-05-28', name: "Genocide Remembrance Day" },
  { date: '2026-08-26', name: "Heroes' Day" },
  { date: '2026-12-10', name: "Human Rights Day" },
  { date: '2026-12-25', name: "Christmas Day" },
  { date: '2026-12-26', name: "Family Day" },

  // 2027 Holidays
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-03-21', name: "Independence Day" },
  { date: '2027-03-26', name: "Good Friday" },
  { date: '2027-03-29', name: "Easter Monday" },
  { date: '2027-05-01', name: "Workers' Day" },
  { date: '2027-05-04', name: "Cassinga Day" },
  { date: '2027-05-06', name: "Ascension Day" },
  { date: '2027-05-25', name: "Africa Day" },
  { date: '2027-05-28', name: "Genocide Remembrance Day" },
  { date: '2027-08-26', name: "Heroes' Day" },
  { date: '2027-12-10', name: "Human Rights Day" },
  { date: '2027-12-25', name: "Christmas Day" },
  { date: '2027-12-26', name: "Family Day" }
];

export function isNamibianPublicHoliday(dateStr: string): boolean {
  return PUBLIC_HOLIDAYS_LIST.some(h => h.date === dateStr);
}

export function getNamibianHolidayName(dateStr: string): string | null {
  const h = PUBLIC_HOLIDAYS_LIST.find(holiday => holiday.date === dateStr);
  return h ? h.name : null;
}
