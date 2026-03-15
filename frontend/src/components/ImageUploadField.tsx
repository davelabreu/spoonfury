import { useRef, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (url: string) => void;
  token: string;
}

export function ImageUploadField({ value, onChange, token }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const res = await api.upload("/recipes/upload-image/", file, token);
      onChange(res.url);
    } catch {
      setUploadError("Upload failed. Try a URL instead.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 text-sm flex-1"
          placeholder="Paste photo URL…"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 text-sm border rounded bg-muted/50 hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "📷 Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      {value && (
        <div className="relative rounded-xl overflow-hidden aspect-video w-full border group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove photo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
