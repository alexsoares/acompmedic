"use client";

import { useState, useEffect, useRef } from "react";
import { searchDoctorUsers } from "@/actions/dashboard-actions";
import { inputClass, buttonClass, secondaryButtonClass, Field } from "@/components/dashboard/ui";

interface DoctorFormProps {
  action: (formData: FormData) => Promise<void> | void;
  submitLabel: string;
  cancelHref?: string;
  initialValues?: {
    id?: string;
    fullName?: string;
    crm?: string;
    specialty?: string;
    phone?: string;
    email?: string;
    userId?: string | null;
  };
  labels: {
    fullName: string;
    crm: string;
    specialty: string;
    phone: string;
    email: string;
    cancel: string;
  };
  isPatient: boolean;
}

export function DoctorForm({
  action,
  submitLabel,
  cancelHref,
  initialValues = {},
  labels,
  isPatient,
}: DoctorFormProps) {
  const [fullName, setFullName] = useState(initialValues.fullName ?? "");
  const [crm, setCrm] = useState(initialValues.crm ?? "");
  const [specialty, setSpecialty] = useState(initialValues.specialty ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [associatedUserId, setAssociatedUserId] = useState<string | null>(initialValues.userId ?? null);
  const [associatedDoctorName, setAssociatedDoctorName] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    email: string;
    fullName: string;
    crm: string;
    specialty: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search when name changes (debounced)
  useEffect(() => {
    if (!isPatient) return; // Only patients trigger lookup/association
    if (associatedUserId) return; // Don't search if already associated

    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchDoctorUsers(trimmed);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        console.error("Erro ao buscar médicos:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [fullName, associatedUserId, isPatient]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDoctorUser = (doctorUser: {
    id: string;
    fullName: string;
    crm: string;
    specialty: string;
    email: string;
  }) => {
    setAssociatedUserId(doctorUser.id);
    setAssociatedDoctorName(doctorUser.fullName);
    setFullName(doctorUser.fullName);
    if (doctorUser.crm) setCrm(doctorUser.crm);
    if (doctorUser.specialty) setSpecialty(doctorUser.specialty);
    if (doctorUser.email) setEmail(doctorUser.email);
    setShowDropdown(false);
  };

  const handleClearAssociation = () => {
    setAssociatedUserId(null);
    setAssociatedDoctorName(null);
  };

  return (
    <form action={action} className="grid gap-3">
      {initialValues.id && <input type="hidden" name="id" value={initialValues.id} />}
      <input type="hidden" name="associatedUserId" value={associatedUserId || ""} />

      <div className="relative" ref={dropdownRef}>
        <Field label={labels.fullName}>
          <input
            name="fullName"
            required
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (associatedUserId) {
                // If they change the name after associating, let's keep the association
                // but let them clear it if they want.
              }
            }}
            className={inputClass}
            autoComplete="off"
          />
        </Field>

        {isSearching && (
          <div className="absolute right-3 top-9 flex items-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          </div>
        )}

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
              Médicos encontrados no sistema (Selecione para associar):
            </div>
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelectDoctorUser(result)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50 transition"
              >
                <span className="text-sm font-semibold text-slate-800">{result.fullName}</span>
                <span className="text-xs text-slate-500">
                  {result.specialty ? `${result.specialty} • ` : ""}
                  {result.crm ? `CRM: ${result.crm} • ` : ""}
                  {result.email}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {associatedUserId && (
        <div className="rounded-md bg-teal-50 border border-teal-200 p-2.5 flex items-center justify-between text-xs text-teal-800 font-medium">
          <span>
            ✓ Associado à conta de médico: <strong>{associatedDoctorName || fullName}</strong>
          </span>
          <button
            type="button"
            onClick={handleClearAssociation}
            className="text-teal-900 underline hover:text-teal-950 transition"
          >
            Remover associação
          </button>
        </div>
      )}

      <Field label={labels.crm}>
        <input
          name="crm"
          required
          value={crm}
          onChange={(e) => setCrm(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={labels.specialty}>
        <input
          name="specialty"
          required
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={labels.phone}>
        <input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={labels.email}>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="mt-2 flex items-center justify-end gap-2">
        {cancelHref && (
          <a href={cancelHref} className={secondaryButtonClass}>
            {labels.cancel}
          </a>
        )}
        <button type="submit" className={buttonClass}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
