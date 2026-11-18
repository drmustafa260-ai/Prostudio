export const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export const GENDER_LABELS: Record<string, string> = { male: "ذكر", female: "أنثى" };

const dateFmt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" });
const timeFmt = new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatTime = (d: Date) => timeFmt.format(d);
export const formatMoney = (n: number) => `${n.toLocaleString("ar-EG")} ج.م`;

export function ageFrom(birthDate: Date | null): string {
  if (!birthDate) return "—";
  const diff = Date.now() - birthDate.getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} سنة`;
}

/** Start and end of the local day containing `d`. */
export function dayRange(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** yyyy-mm-dd in local time, for <input type="date">. */
export function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
