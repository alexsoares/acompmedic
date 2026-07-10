"use client";

import { useRef, useState, useTransition } from "react";
import { createPatientMedicalReport } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, textareaClass } from "@/components/dashboard/ui";
import { DoctorSelectField } from "@/components/dashboard/doctor-select-field";

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
}

interface PatientReportFormProps {
  patientId: string;
  returnPath: string;
  availableDoctors: Doctor[];
}

export function PatientReportForm({ patientId, returnPath, availableDoctors }: PatientReportFormProps) {
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
        await createPatientMedicalReport(formData);
        setStatus({ type: "success", message: "Laudo/exame enviado com sucesso!" });
        formRef.current?.reset();
        setSelectedSpecialty("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar laudo.";
        setStatus({ type: "error", message: msg });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="returnPath" value={returnPath} />

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

      <Field label="Título">
        <input name="title" required className={inputClass} />
      </Field>

      <Field label="Médico responsável">
        <DoctorSelectField
          initialDoctors={availableDoctors}
          loadingLabel="Selecione"
          onDoctorChange={handleDoctorChange}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Especialidade">
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
        <Field label="Data do laudo">
          <input name="reportDate" type="date" className={inputClass} />
        </Field>
      </div>

      <Field label="Arquivo (PDF ou TXT)">
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.txt,application/pdf,text/plain"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm w-full"
        />
      </Field>

      <Field label="Observações">
        <textarea name="observations" className={textareaClass} />
      </Field>

      <button type="submit" className={buttonClass} disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar laudo"}
      </button>
    </form>
  );
}
