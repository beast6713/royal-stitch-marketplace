"use client";

import { CheckCircle2, LoaderCircle, UploadCloud } from "lucide-react";
import type { ChangeEvent } from "react";
import { useId, useState } from "react";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function CloudinaryUpload({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = Boolean(cloudName && uploadPreset);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !isConfigured || disabled) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset as string);

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { secure_url?: string; error?: { message?: string } };

      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message ?? "Cloudinary upload failed.");
      }

      onChange(data.secure_url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the image.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="rounded-[24px] border border-dashed border-royal/20 bg-royal/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-royal">Cloudinary upload</p>
          <p className="mt-1 text-sm text-slate-600">
            {isConfigured
              ? "Upload a product photo directly from your device."
              : "Add Cloudinary environment keys to enable direct uploads."}
          </p>
        </div>

        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            isConfigured && !disabled
              ? "bg-royal text-white hover:bg-royal-soft"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {isUploading ? "Uploading..." : "Upload image"}
        </label>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={!isConfigured || disabled || isUploading}
      />

      {value ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-pine/10 px-3 py-1.5 text-sm font-medium text-pine">
          <CheckCircle2 className="h-4 w-4" />
          Image attached
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
