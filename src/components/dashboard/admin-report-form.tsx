"use client";

import { useRef, useState, useTransition } from "react";
import { createMedicalReport } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, textareaClass } from "@/components/dashboard/ui";
import { DoctorSelectField } from "@/components/dashboard/doctor-select-field";

interface Patient {
  id: string;
  fullName: string;
}

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
}

interface Appointment {
  id: string;
  patientFullName: string;
  doctorFullName: string;
}

interface AdminReportFormProps {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  labels: {
    title: string;
    patient: string;
    doctor: string;
    appointment: string;
    specialty: string;
    reportDate: string;
    file: string;
    observations: string;
    save: string;
    loading: string;
    noAppointment: string;
  };
}

export function AdminReportForm({ patients, doctors, appointments, labels }: AdminReportFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  const handleDoctorChange = (doctor: Doctor | null) => {
    setSelectedSpecialty(doctor?.specialty ?? "");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setStatus(null);
    startTransition(async () => {
      try {
        await createMedicalReport(formData);
        setStatus({ type: "success", message: "Laudo criado com sucesso!" });
        formRef.current?.reset();
        setSelectedSpecialty("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar laudo.";
        setStatus({ type: "error", message: msg });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      {status && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status.message}
        </div>
      )}

      <Field label={labels.title}>
        <input name="title" required className={inputClass} />
      </Field>

      <Field label={labels.patient}>
        <select name="patientId" required className={inputClass}>
          <option value="">{labels.loading}</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>
      </Field>

      <Field label={labels.doctor}>
        <DoctorSelectField
          initialDoctors={doctors}
          loadingLabel={labels.loading}
          onDoctorChange={handleDoctorChange}
        />
      </Field>

      <Field label={labels.appointment}>
        <select name="appointmentId" className={inputClass}>
          <option value="">{labels.noAppointment}</option>
          {appointments.map((appt) => (
            <option key={appt.id} value={appt.id}>
              {appt.patientFullName} - {appt.doctorFullName}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={labels.specialty}>
          <input
            name="specialty"
            required
            value={selectedSpecialty}
            onChange={() => {/* controlled by doctor selection */}}
            disabled={!!selectedSpecialty}
            placeholder={selectedSpecialty ? "" : "Selecione um médico"}
            className={`${inputClass} ${selectedSpecialty ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
          />
        </Field>
        <Field label={labels.reportDate}>
          <input name="reportDate" type="date" className={inputClass} />
        </Field>
      </div>

      <Field label={labels.file}>
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.txt,application/pdf,text/plain"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm w-full"
        />
      </Field>

      <Field label={labels.observations}>
        <textarea name="observations" className={textareaClass} />
      </Field>

      <button type="submit" className={buttonClass} disabled={isPending}>
        {isPending ? "Salvando..." : labels.save}
      </button>
    </form>
  );
}
