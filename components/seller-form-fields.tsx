"use client";

import { Upload } from "lucide-react";
import type { ChangeEvent } from "react";

export function SellerField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none transition focus:border-royal/30 focus:ring-2 focus:ring-royal/10"
      />
    </label>
  );
}

export function SellerTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
        {label}
      </span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-[18px] border border-royal/10 bg-white px-4 py-3 text-sm text-royal outline-none transition focus:border-royal/30 focus:ring-2 focus:ring-royal/10"
      />
    </label>
  );
}

export function SellerUploadField({
  label,
  value,
  multiple = false,
  onChange
}: {
  label: string;
  value: string;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block rounded-[22px] border border-dashed border-royal/20 bg-white/75 p-5">
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-royal/55">
        <Upload className="h-4 w-4" />
        {label}
      </span>
      <input
        type="file"
        multiple={multiple}
        onChange={onChange}
        className="mt-4 block w-full text-sm text-royal file:mr-4 file:rounded-full file:border-0 file:bg-royal file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      <p className="mt-3 text-sm text-royal/60">{value || "No file selected. UI only."}</p>
    </label>
  );
}
