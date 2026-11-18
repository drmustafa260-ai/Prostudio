"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function required(form: FormData, key: string, label: string): string {
  const v = str(form, key);
  if (!v) throw new Error(`الحقل "${label}" مطلوب`);
  return v;
}

// ---------- Patients ----------
export async function createPatient(form: FormData) {
  const birth = str(form, "birthDate");
  const patient = await db.patient.create({
    data: {
      name: required(form, "name", "الاسم"),
      phone: required(form, "phone", "الهاتف"),
      gender: str(form, "gender") === "female" ? "female" : "male",
      birthDate: birth ? new Date(birth) : null,
      notes: str(form, "notes") || null,
    },
  });
  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function deletePatient(form: FormData) {
  await db.patient.delete({ where: { id: Number(form.get("id")) } });
  revalidatePath("/patients");
  redirect("/patients");
}

// ---------- Doctors ----------
export async function createDoctor(form: FormData) {
  await db.doctor.create({
    data: {
      name: required(form, "name", "الاسم"),
      specialty: required(form, "specialty", "التخصص"),
      phone: str(form, "phone") || null,
    },
  });
  revalidatePath("/doctors");
}

export async function deleteDoctor(form: FormData) {
  await db.doctor.delete({ where: { id: Number(form.get("id")) } });
  revalidatePath("/doctors");
}

// ---------- Appointments ----------
export async function createAppointment(form: FormData) {
  const date = required(form, "date", "التاريخ");
  const time = required(form, "time", "الوقت");
  const when = new Date(`${date}T${time}`);
  if (Number.isNaN(when.getTime())) throw new Error("تاريخ أو وقت غير صالح");

  await db.appointment.create({
    data: {
      date: when,
      patientId: Number(required(form, "patientId", "المريض")),
      doctorId: Number(required(form, "doctorId", "الطبيب")),
      reason: str(form, "reason") || null,
      fee: Math.max(0, Number(str(form, "fee")) || 0),
    },
  });
  revalidatePath("/");
  revalidatePath("/appointments");
  redirect(`/appointments?date=${date}`);
}

export async function setAppointmentStatus(form: FormData) {
  const status = str(form, "status");
  if (!["scheduled", "completed", "cancelled"].includes(status)) return;
  await db.appointment.update({ where: { id: Number(form.get("id")) }, data: { status } });
  revalidatePath("/");
  revalidatePath("/appointments");
  revalidatePath("/patients", "layout");
}
