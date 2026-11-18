import Link from "next/link";
import { db } from "@/lib/db";
import { createAppointment } from "@/lib/actions";
import { toDateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const { patientId } = await searchParams;
  const [patients, doctors] = await Promise.all([
    db.patient.findMany({ orderBy: { name: "asc" } }),
    db.doctor.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (patients.length === 0 || doctors.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center text-sm">
        <p className="mb-3">يجب إضافة مريض وطبيب واحد على الأقل قبل حجز موعد.</p>
        <div className="flex justify-center gap-2">
          <Link href="/patients/new" className="btn-ghost">إضافة مريض</Link>
          <Link href="/doctors" className="btn-ghost">إضافة طبيب</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">حجز موعد</h1>
      <form action={createAppointment} className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">المريض *</label>
          <select name="patientId" required defaultValue={patientId ?? ""} className="input">
            <option value="" disabled>اختر المريض</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">الطبيب *</label>
          <select name="doctorId" required defaultValue="" className="input">
            <option value="" disabled>اختر الطبيب</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
          </select>
        </div>
        <div>
          <label className="label">التاريخ *</label>
          <input type="date" name="date" required defaultValue={toDateInput(new Date())} className="input" />
        </div>
        <div>
          <label className="label">الوقت *</label>
          <input type="time" name="time" required defaultValue="10:00" className="input" />
        </div>
        <div>
          <label className="label">سبب الزيارة</label>
          <input name="reason" className="input" />
        </div>
        <div>
          <label className="label">الرسوم</label>
          <input type="number" name="fee" min={0} defaultValue={0} className="input" />
        </div>
        <div className="sm:col-span-2">
          <button className="btn w-full">تأكيد الحجز</button>
        </div>
      </form>
    </div>
  );
}
