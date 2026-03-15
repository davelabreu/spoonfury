import { useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Camera, Trash2, Upload, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ImageUploadField — unified drop zone for recipe hero photos.
 *
 * Supports two input methods:
 *   1. File upload (drag-and-drop or click-to-browse) — PRIMARY action
 *   2. URL paste — secondary, revealed via "or paste a URL" toggle
 *
 * Props API is unchanged from the previous version so CreateRecipePage
 * and EditRecipePage don't need any modifications.
 *
 * Visual states: idle → dragover → uploading → preview
 *                                 ↘ error → idle
 */

interface Props {
  value: string;
  onChange: (url: string) => void;
  token: string;
}

export function ImageUploadField({ value, onChange, token }: Props) {
  // --- State machine ---
  // `uploading` and `dragover` drive the visual state.
  // `value` being truthy means we're in "preview" state.
  const [uploading, setUploading] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [error, setError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection — from either the file picker or a drop event.
   * Uploads to the existing backend endpoint and calls onChange with the URL.
   */
  const uploadFile = useCallback(async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const res = await api.upload("/recipes/upload-image/", file, token);
      onChange(res.url);
    } catch {
      setError("Upload failed. Try again or paste a URL instead.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [token, onChange]);

  /** File input change handler — extracts the file and delegates to uploadFile */
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // --- Drag-and-drop handlers ---
  // dragover state drives the visual "Drop it!" indicator
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadFile(file);
    } else {
      setError("Please drop an image file (JPG, PNG, etc.).");
    }
  }, [uploadFile]);

  /** Remove the current image and reset to idle state */
  const handleRemove = () => {
    onChange("");
    setShowUrlInput(false);
    setError("");
  };

  // =====================
  // PREVIEW STATE — image is set, show it with a remove overlay
  // =====================
  if (value && !uploading) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden aspect-video w-full border group">
          <img
            src={value}
            alt="Recipe photo preview"
            className="w-full h-full object-cover"
            onError={() => setError("Image failed to load. Try a different URL or upload a file.")}
          />
          {/* Hover overlay with remove button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRemove}
              className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Remove photo
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // =====================
  // IDLE / DRAGOVER / UPLOADING STATE — show the drop zone
  // =====================
  return (
    <div className="space-y-2">
      {/* Drop zone — click to browse, drag to upload */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer",
          // Visual state classes
          dragover
            ? "border-indigo-400 bg-indigo-50/50"
            : "border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/30",
          uploading && "pointer-events-none opacity-60",
        ].filter(Boolean).join(" ")}
        style={{ minHeight: "180px" }}
      >
        {uploading ? (
          // UPLOADING state
          <>
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Uploading...</p>
          </>
        ) : dragover ? (
          // DRAGOVER state
          <>
            <Upload className="w-8 h-8 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-600">Drop it!</p>
          </>
        ) : (
          // IDLE state — primary upload prompt
          <>
            <Camera className="w-8 h-8 text-muted-foreground/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your photo here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP — recommended 16:9
              </p>
            </div>
          </>
        )}
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Secondary action: URL paste toggle */}
      {!uploading && (
        <div className="text-center">
          {showUrlInput ? (
            <div className="flex gap-2 items-center">
              <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                className="border rounded-md px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="https://example.com/photo.jpg"
                autoFocus
                onPaste={(e) => {
                  // Grab the pasted text and set it immediately
                  const pasted = e.clipboardData.getData("text");
                  if (pasted.startsWith("http")) {
                    e.preventDefault();
                    onChange(pasted);
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val.startsWith("http")) onChange(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val.startsWith("http")) onChange(val);
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              or paste a URL
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
