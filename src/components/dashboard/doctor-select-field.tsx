"use client";

import { useState } from "react";
import { createDoctorAsync } from "@/actions/dashboard-actions";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/dashboard/ui";

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
}

interface DoctorSelectFieldProps {
  initialDoctors: Doctor[];
  loadingLabel: string;
  /** Called whenever the selected doctor changes (null = no selection) */
  onDoctorChange?: (doctor: Doctor | null) => void;
}

export function DoctorSelectField({ initialDoctors, loadingLabel, onDoctorChange }: DoctorSelectFieldProps) {
  const [doctors, setDoctors] = useState(initialDoctors);
  const [selectedId, setSelectedId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [crm, setCrm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    if (onDoctorChange) {
      const found = doctors.find((d) => d.id === id) ?? null;
      onDoctorChange(found);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedCrm = crm.trim();
    const trimmedSpecialty = specialty.trim();

    if (!trimmedName || !trimmedCrm || !trimmedSpecialty) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const newDoctor = await createDoctorAsync({
        fullName: trimmedName,
        crm: trimmedCrm,
        specialty: trimmedSpecialty,
      });

      const sorted = [...doctors, newDoctor].sort((a, b) => a.fullName.localeCompare(b.fullName));
      setDoctors(sorted);
      setSelectedId(newDoctor.id);
      if (onDoctorChange) {
        onDoctorChange(newDoctor);
      }
      setIsOpen(false);
      setFullName("");
      setCrm("");
      setSpecialty("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar médico.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          name="doctorId"
          required
          value={selectedId}
          onChange={handleSelectChange}
          className={`${inputClass} flex-1`}
        >
          <option value="">{loadingLabel}</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.fullName} - {doctor.specialty}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={secondaryButtonClass}
        >
          + Novo
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Cadastrar Novo Médico</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded bg-rose-50 p-2 text-xs font-medium text-rose-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Nome Completo
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${inputClass} w-full`}
                  placeholder="Ex: Dr. João Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  CRM
                </label>
                <input
                  required
                  value={crm}
                  onChange={(e) => setCrm(e.target.value)}
                  className={`${inputClass} w-full`}
                  placeholder="Ex: CRM-SP-123456"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Especialidade
                </label>
                <input
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className={`${inputClass} w-full`}
                  placeholder="Ex: Cardiologia"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError(null);
                  }}
                  className={secondaryButtonClass}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={buttonClass}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
