import Link from "next/link";
import { db } from "@/lib/db";
import { dayRange, formatMoney, formatTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusActions } from "@/components/StatusActions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { start, end } = dayRange(new Date());
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

  const [patients, doctors, today, monthRevenue] = await Promise.all([
    db.patient.count(),
    db.doctor.count(),
    db.appointment.findMany({
      where: { date: { gte: start, lt: end } },
      include: { patient: true, doctor: true },
      orderBy: { date: "asc" },
    }),
    db.appointment.aggregate({
      _sum: { fee: true },
      where: { status: "completed", date: { gte: monthStart } },
    }),
  ]);

  const stats = [
    { label: "مواعيد اليوم", value: today.length.toLocaleString("ar-EG") },
    { label: "إجمالي المرضى", value: patients.toLocaleString("ar-EG") },
    { label: "الأطباء", value: doctors.toLocaleString("ar-EG") },
    { label: "إيراد الشهر", value: formatMoney(monthRevenue._sum.fee ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <div className="flex gap-2">
          <Link href="/patients/new" className="btn-ghost">+ مريض جديد</Link>
          <Link href="/appointments/new" className="btn">+ حجز موعد</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-700">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-bold">مواعيد اليوم</h2>
        {today.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">لا توجد مواعيد اليوم.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>الوقت</th><th>المريض</th><th>الطبيب</th><th>السبب</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {today.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{formatTime(a.date)}</td>
                  <td><Link className="hover:underline" href={`/patients/${a.patientId}`}>{a.patient.name}</Link></td>
                  <td>{a.doctor.name}</td>
                  <td className="text-slate-500">{a.reason ?? "—"}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><StatusActions id={a.id} status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
