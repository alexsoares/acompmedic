"use client";

import { useRef, useState, useTransition } from "react";
import { AppointmentStatus } from "@prisma/client";
import { createAppointment } from "@/actions/dashboard-actions";
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

interface AppointmentCreateFormProps {
  patients: Patient[];
  doctors: Doctor[];
  patientLabel: string;
  doctorLabel: string;
  startsAtLabel: string;
  durationLabel: string;
  statusLabel: string;
  notesLabel: string;
  saveLabel: string;
  loadingLabel: string;
  statusOptions: Record<string, string>;
}

export function AppointmentCreateForm({
  patients,
  doctors,
  patientLabel,
  doctorLabel,
  startsAtLabel,
  durationLabel,
  statusLabel,
  notesLabel,
  saveLabel,
  loadingLabel,
  statusOptions,
}: AppointmentCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setStatus(null);
    startTransition(async () => {
      try {
        await createAppointment(formData);
        setStatus({ type: "success", message: "Agendamento criado com sucesso!" });
        formRef.current?.reset();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar agendamento.";
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

      <Field label={patientLabel}>
        <select name="patientId" required className={inputClass}>
          <option value="">{loadingLabel}</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>
      </Field>

      <Field label={doctorLabel}>
        <DoctorSelectField
          initialDoctors={doctors}
          loadingLabel={loadingLabel}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={startsAtLabel}>
          <input name="startsAt" type="datetime-local" required className={inputClass} />
        </Field>
        <Field label={durationLabel}>
          <input name="durationMinutes" type="number" min="10" step="5" defaultValue="30" className={inputClass} />
        </Field>
      </div>

      <Field label={statusLabel}>
        <select name="status" defaultValue={AppointmentStatus.SCHEDULED} className={inputClass}>
          {Object.entries(statusOptions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={notesLabel}>
        <textarea name="notes" className={textareaClass} />
      </Field>

      <button type="submit" className={buttonClass} disabled={isPending}>
        {isPending ? "Salvando..." : saveLabel}
      </button>
    </form>
  );
}
