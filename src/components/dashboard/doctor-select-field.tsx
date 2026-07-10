"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  // Needed for createPortal to work correctly with SSR
  useEffect(() => { setMounted(true); }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    if (onDoctorChange) {
      onDoctorChange(id ? (doctors.find((d) => d.id === id) ?? null) : null);
    }
  };

  const handleModalSubmit = async (e: React.MouseEvent) => {
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

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setFullName("");
    setCrm("");
    setSpecialty("");
  };

  const modal = mounted && isOpen ? createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Cadastrar Novo Médico</h3>

        {error && (
          <div className="mb-4 rounded bg-rose-50 p-2 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Completo</label>
            <input
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className={`${inputClass} w-full`}
              placeholder="Ex: Dr. João Silva"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">CRM</label>
            <input
              value={crm}
              onChange={(e) => setCrm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className={`${inputClass} w-full`}
              placeholder="Ex: CRM-SP-123456"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Especialidade</label>
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className={`${inputClass} w-full`}
              placeholder="Ex: Cardiologia"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className={secondaryButtonClass}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleModalSubmit}
            className={buttonClass}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
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
      {modal}
    </>
  );
}
