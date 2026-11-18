import Link from "next/link";
import { db } from "@/lib/db";
import { dayRange, formatDate, formatMoney, formatTime, toDateInput } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusActions } from "@/components/StatusActions";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; doctorId?: string }>;
}) {
  const sp = await searchParams;
  const day = sp.date ? new Date(`${sp.date}T00:00`) : new Date();
  const { start, end } = dayRange(Number.isNaN(day.getTime()) ? new Date() : day);
  const doctorId = sp.doctorId ? Number(sp.doctorId) : undefined;

  const [doctors, appointments] = await Promise.all([
    db.doctor.findMany({ orderBy: { name: "asc" } }),
    db.appointment.findMany({
      where: { date: { gte: start, lt: end }, ...(doctorId ? { doctorId } : {}) },
      include: { patient: true, doctor: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const shift = (days: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() + days);
    const qs = new URLSearchParams({ date: toDateInput(d), ...(doctorId ? { doctorId: String(doctorId) } : {}) });
    return `/appointments?${qs}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">المواعيد</h1>
        <Link href="/appointments/new" className="btn">+ حجز موعد</Link>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <Link href={shift(-1)} className="btn-ghost">→ السابق</Link>
        <form className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">اليوم</label>
            <input type="date" name="date" defaultValue={toDateInput(start)} className="input" />
          </div>
          <div>
            <label className="label">الطبيب</label>
            <select name="doctorId" defaultValue={doctorId ?? ""} className="input">
              <option value="">الكل</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button className="btn-ghost">عرض</button>
        </form>
        <Link href={shift(1)} className="btn-ghost">التالي ←</Link>
        <p className="ms-auto text-sm text-slate-500">{formatDate(start)} · {appointments.length.toLocaleString("ar-EG")} موعد</p>
      </div>

      <div className="card overflow-x-auto">
        {appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">لا توجد مواعيد في هذا اليوم.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>الوقت</th><th>المريض</th><th>الهاتف</th><th>الطبيب</th><th>السبب</th><th>الرسوم</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{formatTime(a.date)}</td>
                  <td><Link href={`/patients/${a.patientId}`} className="hover:underline">{a.patient.name}</Link></td>
                  <td dir="ltr" className="text-right">{a.patient.phone}</td>
                  <td>{a.doctor.name}</td>
                  <td className="text-slate-500">{a.reason ?? "—"}</td>
                  <td>{formatMoney(a.fee)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><StatusActions id={a.id} status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
