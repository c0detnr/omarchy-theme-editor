import { useLanguage } from '../i18n';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { colorKeys, HEX, type ColorKey, type Palette } from '../theme/model';
export const labels: Partial<Record<ColorKey, string>> = {
  accent: 'Vurgu',
  background: 'Arka plan',
  foreground: 'Metin',
  selection: 'Seçim',
  muted: 'Soluk',
  dark_background: 'Koyu yüzey',
  darker_background: 'En koyu yüzey',
  lighter_background: 'Açık yüzey',
  dark_foreground: 'İkincil metin',
  light_foreground: 'Açık metin',
  bright_foreground: 'Parlak metin',
  selection_background: 'Seçili alan',
  selection_foreground: 'Seçili metin',
  red: 'Kırmızı',
  green: 'Yeşil',
  yellow: 'Sarı',
  blue: 'Mavi',
  magenta: 'Mor',
  cyan: 'Camgöbeği',
  orange: 'Turuncu',
  brown: 'Kahverengi',
};
export function ColorField({
  colorKey,
  value,
  palette,
  onChange,
}: {
  colorKey: ColorKey;
  value: string;
  palette: Palette;
  onChange: (key: ColorKey, value: string, group?: string) => void;
}) {
  const { t } = useLanguage();
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState(value);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const group = useRef('');
  const gesture = useRef(0);
  useEffect(() => setDraft(value), [value]);
  const invalid = !HEX.test(draft);
  const label =
    (labels[colorKey] ? t(labels[colorKey]!) : undefined) ??
    colorKey.replace('bright_', t('Parlak ')).replaceAll('_', ' ');
  const swatches = useMemo(() => {
    const unique = new Map<string, { value: string; names: string[] }>();
    for (const key of colorKeys) {
      const color = palette[key].toLowerCase();
      const name =
        (labels[key] ? t(labels[key]!) : undefined) ??
        key.replace('bright_', t('Parlak ')).replaceAll('_', ' ');
      const swatch = unique.get(color);
      if (swatch) swatch.names.push(name);
      else unique.set(color, { value: color, names: [name] });
    }
    return [...unique.values()];
  }, [palette, t]);

  function beginGesture() {
    group.current = `${id}-${++gesture.current}`;
  }
  function selectColor(color: string) {
    setDraft(color);
    onChange(colorKey, color, group.current);
  }
  function editHex(color: string) {
    setDraft(color);
    if (HEX.test(color)) onChange(colorKey, color.toLowerCase(), group.current);
  }
  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (!open) return;
    const popover = panel.current!;
    const button = trigger.current!;
    function position() {
      const anchor = button.parentElement!.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = (viewport?.offsetLeft ?? 0) + 12;
      const top = (viewport?.offsetTop ?? 0) + 12;
      const right =
        left +
        Math.min(viewport?.width ?? window.innerWidth, window.innerWidth) -
        24;
      const bottom =
        top +
        Math.min(viewport?.height ?? window.innerHeight, window.innerHeight) -
        24;
      popover.style.maxHeight = `${bottom - top}px`;
      popover.style.width = `${Math.min(304, right - left)}px`;
      const height = popover.offsetHeight;
      const x = Math.max(
        left,
        Math.min(
          anchor.right - popover.offsetWidth,
          right - popover.offsetWidth,
        ),
      );
      const preferredY =
        anchor.bottom + 10 + height <= bottom
          ? anchor.bottom + 10
          : anchor.top - height - 10;
      const y = Math.max(top, Math.min(preferredY, bottom - height));
      popover.style.left = `${x}px`;
      popover.style.top = `${y}px`;
    }
    position();
    const sliders = popover.querySelectorAll<HTMLElement>('[role="slider"]');
    sliders[0]?.setAttribute('aria-label', t('Doygunluk ve parlaklık'));
    sliders[1]?.setAttribute('aria-label', t('Renk tonu'));
    // The library's two-dimensional slider needs a numeric ARIA value and
    // Turkish value text alongside its keyboard controls.
    function describeSaturation() {
      const saturation = sliders[0];
      const values = saturation
        ?.getAttribute('aria-valuetext')
        ?.match(/(\d+)%.*?(\d+)%/);
      if (!saturation || !values) return;
      saturation.setAttribute('aria-valuemin', '0');
      saturation.setAttribute('aria-valuemax', '100');
      saturation.setAttribute('aria-valuenow', values[1]);
      const text = t('Doygunluk {s}%, parlaklık {b}%', {
        s: values[1],
        b: values[2],
      });
      if (saturation.getAttribute('aria-valuetext') !== text) {
        saturation.setAttribute('aria-valuetext', text);
      }
    }
    describeSaturation();
    const descriptionObserver = new MutationObserver(describeSaturation);
    if (sliders[0])
      descriptionObserver.observe(sliders[0], {
        attributes: true,
        attributeFilter: ['aria-valuetext'],
      });
    sliders[0]?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(popover);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      observer.disconnect();
      descriptionObserver.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, t]);

  return (
    <div className={`color-field ${invalid ? 'invalid' : ''}`}>
      <label className="color-label" htmlFor={id}>
        <span>{label}</span>
        <small aria-hidden="true">{colorKey}</small>
      </label>
      <div className="color-inputs">
        <button
          ref={trigger}
          type="button"
          className="color-trigger"
          aria-label={t('{label} renk seçici', { label })}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-picker`}
          popoverTarget={`${id}-picker`}
          title={t('Renk seçiciyi aç')}
        >
          <span style={{ backgroundColor: value }} />
        </button>
        <input
          id={id}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          spellCheck={false}
          value={draft}
          maxLength={7}
          onFocus={beginGesture}
          onChange={(e) => editHex(e.target.value)}
        />
      </div>
      <div
        ref={panel}
        id={`${id}-picker`}
        className="color-popover"
        popover="auto"
        role="dialog"
        aria-label={t('{label} renk seçici', { label })}
        onBeforeToggle={(event) => {
          const opening = event.newState === 'open';
          if (opening) {
            setInitial(value);
            setDraft(value);
          }
        }}
        onToggle={(event) => setOpen(event.newState === 'open')}
      >
        {open && (
          <>
            <div className="color-picker-heading">
              <h2>{label}</h2>
              <button
                type="button"
                className="color-picker-close"
                aria-label={t('Renk seçiciyi kapat')}
                onClick={close}
              >
                <X size={16} />
              </button>
            </div>
            <HexColorPicker
              color={value}
              onChange={selectColor}
              onPointerDownCapture={beginGesture}
              onKeyDownCapture={(event) => {
                if (!event.repeat && event.key.startsWith('Arrow'))
                  beginGesture();
              }}
              aria-label={t('{label} renk ayarı', { label })}
            />
            <div className="color-picker-values">
              <button
                type="button"
                className="color-picker-original"
                aria-label={t('Başlangıç rengine dön: {color}', {
                  color: initial,
                })}
                title={t('Panel açıldığındaki renge dön')}
                disabled={value.toLowerCase() === initial.toLowerCase()}
                onClick={() => {
                  beginGesture();
                  selectColor(initial);
                }}
              >
                <span
                  className="color-picker-preview"
                  style={{ backgroundColor: initial }}
                >
                  <RotateCcw size={13} />
                </span>
                <span>
                  <span className="color-picker-value-label">
                    {t('Başlangıç')}
                  </span>
                  <span className="color-picker-original-hex">{initial}</span>
                </span>
              </button>
              <div className={`color-picker-hex ${invalid ? 'invalid' : ''}`}>
                <span
                  className="color-picker-preview"
                  style={{ backgroundColor: value }}
                />
                <div>
                  <label
                    className="color-picker-value-label"
                    htmlFor={`${id}-hex`}
                  >
                    HEX
                  </label>
                  <input
                    id={`${id}-hex`}
                    aria-label={`${label} HEX`}
                    aria-invalid={invalid}
                    aria-describedby={
                      invalid ? `${id}-picker-error` : undefined
                    }
                    value={draft}
                    spellCheck={false}
                    autoComplete="off"
                    maxLength={7}
                    onFocus={beginGesture}
                    onChange={(event) => editHex(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !invalid) {
                        event.preventDefault();
                        close();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            {invalid && (
              <p className="field-error" id={`${id}-picker-error`}>
                {t('#RRGGBB biçimini kullanın.')}
              </p>
            )}
            <div className="color-picker-palette">
              <h3>{t('Tema paleti')}</h3>
              <div
                className="color-picker-swatches"
                role="group"
                aria-label={t('Tema renkleri')}
              >
                {swatches.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    className="color-picker-swatch"
                    style={{ backgroundColor: swatch.value }}
                    aria-label={`${swatch.names.join(', ')}: ${swatch.value}`}
                    title={`${swatch.names.join(', ')} · ${swatch.value}`}
                    aria-pressed={value.toLowerCase() === swatch.value}
                    onClick={() => {
                      beginGesture();
                      selectColor(swatch.value);
                    }}
                  >
                    {value.toLowerCase() === swatch.value && (
                      <Check size={12} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <p className="color-picker-hint">
              {t('Değişiklikler anında önizlenir.')}
            </p>
          </>
        )}
      </div>
      {invalid && (
        <small className="field-error" id={`${id}-error`}>
          {t('#RRGGBB biçimini kullanın.')}
        </small>
      )}
    </div>
  );
}
