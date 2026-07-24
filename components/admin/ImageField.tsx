import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

// ── Image field (v1.8.0 Step 11) ──────────────────────────────────────────────
// Drag-and-drop / file-picker image upload with canvas compression.
// Stores the image as a base64 data URL (v1; v2 swaps in Supabase Storage).
//
// Compression: target max 1200px on the longest edge, JPEG quality 0.85.
// Keeps the resulting data URL under ~500KB which fits in 1 row of Supabase
// (the row limit is 1MB but we share with the trilingual text columns).

interface ImageFieldProps {
  value: string | string[] | null | undefined;
  onChange: (next: string | string[] | null) => void;
  multiple?: boolean;
  max?: number;
  lang: 'EN' | 'ES' | 'PT';
}

const T = {
  upload: { EN: 'Click or drag to upload', ES: 'Haz clic o arrastra para subir', PT: 'Clique ou arraste para enviar' },
  replace: { EN: 'Replace', ES: 'Reemplazar', PT: 'Substituir' },
  remove: { EN: 'Remove', ES: 'Eliminar', PT: 'Remover' },
  tooLarge: {
    EN: 'Image too large. Compress to 1200px and try again.',
    ES: 'Imagen demasiado grande. Comprime a 1200px e inténtalo de nuevo.',
    PT: 'Imagem muito grande. Comprima para 1200px e tente novamente.',
  },
  add: { EN: 'Add image', ES: 'Añadir imagen', PT: 'Adicionar imagem' },
};

const MAX_DIM = 1200;
const QUALITY = 0.85;

/** Reads a File, draws it to a canvas resized to MAX_DIM, returns a JPEG data URL. */
async function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas 2d not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', QUALITY));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('image decode failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

export const ImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  multiple = false,
  max = 1,
  lang,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current: string[] = Array.isArray(value)
    ? value
    : value
    ? [value as string]
    : [];

  const handleFile = async (file: File) => {
    setError(null);
    setIsCompressing(true);
    try {
      const dataUrl = await compressToDataUrl(file);
      if (dataUrl.length > 1_200_000) {
        setError(T.tooLarge[lang]);
        return;
      }
      if (multiple) {
        const next = [...current, dataUrl];
        if (next.length > max) {
          setError(`Max ${max} images.`);
          return;
        }
        onChange(next);
      } else {
        onChange(dataUrl);
      }
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const removeAt = (index: number) => {
    if (multiple) {
      const next = current.filter((_, i) => i !== index);
      onChange(next.length > 0 ? next : null);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Current images grid */}
      {current.length > 0 && (
        <div className={`grid gap-3 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {current.map((url, i) => (
            <div
              key={i}
              className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-video"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="px-3 py-1.5 bg-red-500/90 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full flex items-center gap-1.5"
                >
                  <X size={12} /> {T.remove[lang]}
                </button>
              </div>
              {multiple && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[9px] uppercase tracking-widest rounded">
                  #{i + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / file picker (only if not at max) */}
      {(!multiple || current.length < max) && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={isCompressing}
          className="w-full rounded-xl border-2 border-dashed border-white/15 hover:border-[#B8963E]/50 hover:bg-white/5 transition-all py-8 px-4 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
        >
          {isCompressing ? (
            <>
              <Loader2 className="animate-spin text-[#B8963E]" size={24} />
              <p className="text-[10px] text-white/60 uppercase tracking-[0.3em]">Compressing…</p>
            </>
          ) : (
            <>
              {current.length === 0 ? (
                <Upload className="text-white/40" size={24} />
              ) : (
                <ImageIcon className="text-white/40" size={24} />
              )}
              <p className="text-[10px] text-white/60 uppercase tracking-[0.3em]">
                {current.length === 0 ? T.upload[lang] : T.add[lang]}
              </p>
              <p className="text-[9px] text-white/30">Max 1200px · JPEG · ~500KB after compress</p>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          const files = e.target.files;
          if (!files) return;
          if (multiple) {
            Array.from(files).forEach((f) => f.type.startsWith('image/') && handleFile(f));
          } else {
            const f = files[0];
            if (f && f.type.startsWith('image/')) handleFile(f);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
};
