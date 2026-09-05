export function todayIso() {
  const now = new Date();
  return toIsoDate(now);
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function addDaysIso(iso: string, days: number) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function diffDaysInclusive(startIso: string, endIso: string) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function datesAreValid(startIso: string, endIso: string) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return false;
  const days = diffDaysInclusive(startIso, endIso);
  return days >= 1 && days <= 90;
}

export function isEndBeforeStart(startIso: string, endIso: string) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return false;
  return end.getTime() < start.getTime();
}

export function daysFromToday(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return Number.POSITIVE_INFINITY;
  const today = parseIsoDate(todayIso());
  if (!today) return Number.POSITIVE_INFINITY;
  return Math.floor((date.getTime() - today.getTime()) / 86_400_000);
}

export function formatShortDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(startIso: string, endIso: string) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return `${startIso}–${endIso}`;

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (start.getFullYear() === end.getFullYear()) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}–${endDay}`;
    }
    return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
  }

  return `${formatShortDate(startIso)} – ${formatShortDate(endIso)}`;
}

export function defaultTripDates() {
  const start = addDaysIso(todayIso(), 7);
  return {
    start_date: start,
    end_date: addDaysIso(start, 3),
  };
}
