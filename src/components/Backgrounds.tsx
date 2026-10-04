import { useLanguage } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Trash2, Upload } from 'lucide-react';
import type { Background, ThemeDocument } from '../theme/model';
export function useObjectURL(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
function BackgroundCard({
  background,
  selected,
  select,
  remove,
}: {
  background: Background;
  selected: boolean;
  select: () => void;
  remove: () => void;
}) {
  const { t } = useLanguage();
  const url = useObjectURL(background.blob);
  return (
    <div className={`background-card ${selected ? 'selected' : ''}`}>
      <button
        className="background-select"
        onClick={select}
        aria-pressed={selected}
        aria-label={t('{name} arka planını seç', { name: background.name })}
      >
        <img src={url} alt="" />
        <span>{background.name}</span>
        <small>{(background.blob.size / 1024 / 1024).toFixed(2)} MB</small>
        {selected && (
          <span className="selected-mark">
            <Check size={13} />
          </span>
        )}
      </button>
      <button
        className="background-remove icon-button"
        aria-label={t('{name} arka planını kaldır', {
          name: background.name,
        })}
        onClick={remove}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
export function Backgrounds({
  theme,
  add,
  select,
  remove,
}: {
  theme: ThemeDocument;
  add: (files: File[]) => void;
  select: (id: string | null) => void;
  remove: (id: string) => void;
}) {
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div className="background-panel">
      <div className="section-heading">
        <h2>{t('Arka planlar')}</h2>
        <span>
          {theme.backgrounds.length} {t('görsel')}
        </span>
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        aria-label={t('Arka plan dosyaları')}
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <button
        className={`upload-zone ${drag ? 'dragging' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(Array.from(e.dataTransfer.files));
        }}
      >
        <ImagePlus size={26} />
        <strong>{t('Görsel ekle veya sürükle')}</strong>
        <small>{t('PNG, JPEG, WebP · toplam en fazla 99 MB')}</small>
      </button>
      <button
        className={`plain-background ${!theme.activeBackground ? 'active' : ''}`}
        onClick={() => select(null)}
        aria-pressed={!theme.activeBackground}
      >
        <span
          className="plain-swatch"
          style={{ background: theme.palette.background }}
        />
        <span>{t('Yalnızca tema rengi')}</span>
        {!theme.activeBackground && <Check size={14} />}
      </button>
      <div className="background-grid">
        {theme.backgrounds.map((b) => (
          <BackgroundCard
            key={b.id}
            background={b}
            selected={theme.activeBackground === b.id}
            select={() => select(b.id)}
            remove={() => remove(b.id)}
          />
        ))}
      </div>
      {!!theme.backgrounds.length && (
        <button
          className="secondary wide"
          onClick={() => input.current?.click()}
        >
          <Upload size={14} /> {t('Yeni arka plan ekle')}
        </button>
      )}
    </div>
  );
}
