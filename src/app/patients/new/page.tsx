import { createPatient } from "@/lib/actions";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">إضافة مريض</h1>
      <form action={createPatient} className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">الاسم الكامل *</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">رقم الهاتف *</label>
          <input name="phone" required dir="ltr" className="input text-right" />
        </div>
        <div>
          <label className="label">الجنس</label>
          <select name="gender" className="input">
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
        <div>
          <label className="label">تاريخ الميلاد</label>
          <input type="date" name="birthDate" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">ملاحظات طبية (حساسية، أمراض مزمنة…)</label>
          <textarea name="notes" rows={3} className="input" />
        </div>
        <div className="sm:col-span-2">
          <button className="btn w-full">حفظ</button>
        </div>
      </form>
    </div>
  );
}
