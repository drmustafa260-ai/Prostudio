import { db } from "@/lib/db";
import { createDoctor, deleteDoctor } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  const doctors = await db.doctor.findMany({
    include: { _count: { select: { appointments: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الأطباء</h1>

      <form action={createDoctor} className="card grid gap-3 sm:grid-cols-4 sm:items-end">
        <div>
          <label className="label">الاسم *</label>
          <input name="name" required className="input" placeholder="د. …" />
        </div>
        <div>
          <label className="label">التخصص *</label>
          <input name="specialty" required className="input" placeholder="باطنية، أسنان…" />
        </div>
        <div>
          <label className="label">الهاتف</label>
          <input name="phone" dir="ltr" className="input text-right" />
        </div>
        <button className="btn">+ إضافة طبيب</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => (
          <div key={d.id} className="card flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{d.name}</p>
              <p className="text-sm text-brand-700">{d.specialty}</p>
              {d.phone && <p dir="ltr" className="mt-1 text-right text-sm text-slate-500">{d.phone}</p>}
              <p className="mt-2 text-xs text-slate-400">{d._count.appointments.toLocaleString("ar-EG")} موعد</p>
            </div>
            <form action={deleteDoctor}>
              <input type="hidden" name="id" value={d.id} />
              <button className="text-xs text-rose-500 hover:underline">حذف</button>
            </form>
          </div>
        ))}
        {doctors.length === 0 && <p className="text-sm text-slate-500">لم تتم إضافة أطباء بعد.</p>}
      </div>
    </div>
  );
}
