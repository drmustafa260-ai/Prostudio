import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  if ((await db.doctor.count()) > 0) {
    console.log("البيانات موجودة مسبقاً، تم التخطي.");
    return;
  }
  const doctors = await Promise.all([
    db.doctor.create({ data: { name: "د. أحمد علي", specialty: "باطنية", phone: "0500000001" } }),
    db.doctor.create({ data: { name: "د. سارة محمد", specialty: "أسنان", phone: "0500000002" } }),
    db.doctor.create({ data: { name: "د. خالد حسن", specialty: "أطفال", phone: "0500000003" } }),
  ]);
  const patients = await Promise.all([
    db.patient.create({ data: { name: "محمد عبدالله", phone: "0551111111", gender: "male" } }),
    db.patient.create({ data: { name: "فاطمة يوسف", phone: "0552222222", gender: "female" } }),
    db.patient.create({ data: { name: "عمر سعيد", phone: "0553333333", gender: "male" } }),
  ]);
  const today = new Date();
  const at = (dayOffset, hour) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  await db.appointment.createMany({
    data: [
      { date: at(0, 10), patientId: patients[0].id, doctorId: doctors[0].id, reason: "متابعة ضغط", fee: 200 },
      { date: at(0, 12), patientId: patients[1].id, doctorId: doctors[1].id, reason: "تنظيف أسنان", fee: 300 },
      { date: at(1, 9), patientId: patients[2].id, doctorId: doctors[2].id, reason: "فحص دوري", fee: 150 },
      { date: at(-1, 11), patientId: patients[0].id, doctorId: doctors[0].id, reason: "استشارة", fee: 200, status: "completed" },
    ],
  });
  console.log("تمت إضافة البيانات التجريبية.");
}

main().finally(() => db.$disconnect());
