import Link from "next/link";
import { db } from "@/lib/db";
import { GENDER_LABELS, ageFrom } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const patients = await db.patient.findMany({
    where: term ? { OR: [{ name: { contains: term } }, { phone: { contains: term } }] } : undefined,
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">المرضى</h1>
        <Link href="/patients/new" className="btn">+ مريض جديد</Link>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={term} placeholder="ابحث بالاسم أو رقم الهاتف…" className="input max-w-sm" />
        <button className="btn-ghost">بحث</button>
      </form>

      <div className="card overflow-x-auto">
        {patients.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">لا يوجد مرضى.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الجنس</th><th>العمر</th><th>عدد الزيارات</th></tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="text-slate-400">{p.id}</td>
                  <td><Link href={`/patients/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.name}</Link></td>
                  <td dir="ltr" className="text-right">{p.phone}</td>
                  <td>{GENDER_LABELS[p.gender]}</td>
                  <td>{ageFrom(p.birthDate)}</td>
                  <td>{p._count.appointments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
