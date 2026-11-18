import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deletePatient } from "@/lib/actions";
import { GENDER_LABELS, ageFrom, formatDate, formatMoney, formatTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusActions } from "@/components/StatusActions";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id: Number(id) },
    include: { appointments: { include: { doctor: true }, orderBy: { date: "desc" } } },
  });
  if (!patient) notFound();

  const paid = patient.appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + a.fee, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{patient.name}</h1>
        <div className="flex gap-2">
          <Link href={`/appointments/new?patientId=${patient.id}`} className="btn">+ حجز موعد</Link>
          <form action={deletePatient}>
            <input type="hidden" name="id" value={patient.id} />
            <button className="btn-danger">حذف</button>
          </form>
        </div>
      </div>

      <div className="card grid gap-4 text-sm sm:grid-cols-4">
        <Info label="الهاتف" value={<span dir="ltr">{patient.phone}</span>} />
        <Info label="الجنس" value={GENDER_LABELS[patient.gender]} />
        <Info label="العمر" value={ageFrom(patient.birthDate)} />
        <Info label="إجمالي المدفوع" value={formatMoney(paid)} />
        {patient.notes && (
          <div className="sm:col-span-4">
            <p className="text-slate-500">ملاحظات</p>
            <p className="mt-1 whitespace-pre-line rounded-lg bg-amber-50 p-3 text-amber-900">{patient.notes}</p>
          </div>
        )}
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-bold">سجل المواعيد</h2>
        {patient.appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">لا توجد مواعيد بعد.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>التاريخ</th><th>الوقت</th><th>الطبيب</th><th>السبب</th><th>الرسوم</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {patient.appointments.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.date)}</td>
                  <td>{formatTime(a.date)}</td>
                  <td>{a.doctor.name} <span className="text-slate-400">({a.doctor.specialty})</span></td>
                  <td className="text-slate-500">{a.reason ?? "—"}</td>
                  <td>{formatMoney(a.fee)}</td>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
