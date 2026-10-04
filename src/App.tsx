import { useLanguage } from './i18n';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  Code2,
  Folder,
  Image,
  Info,
  Layers3,
  Moon,
  Palette as PaletteIcon,
  Redo2,
  Sun,
  Undo2,
  X,
} from 'lucide-react';
import { ColorField } from './components/ColorField';
import { Backgrounds } from './components/Backgrounds';
import { iconColorKey, Preview } from './components/Preview';
import { useEditor } from './theme/useEditor';
import {
  assertSlug,
  colorKeys,
  iconSets,
  slugify,
  type ColorKey,
} from './theme/model';
import { presets } from './theme/presets';
import {
  download,
  exportToml,
  exportZip,
  importFile,
  type ImportResult,
} from './theme/io';
import { addImages } from './theme/images';
function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label={t('Pencereyi kapat')}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const primaryKeys: ColorKey[] = [
  'accent',
  'background',
  'foreground',
  'selection',
  'muted',
];
const surfaceKeys: ColorKey[] = [
  'dark_background',
  'darker_background',
  'lighter_background',
  'dark_foreground',
  'light_foreground',
  'bright_foreground',
  'selection_background',
  'selection_foreground',
];
const terminalKeys = colorKeys.filter(
  (key) => !primaryKeys.includes(key) && !surfaceKeys.includes(key),
);
export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, change, undo, redo, canUndo, canRedo, ready, saveState } =
    useEditor();
  const [tab, setTab] = useState('colors');
  const [mobileView, setMobileView] = useState('edit');
  const [colorGroup, setColorGroup] = useState('primary');
  const panelBody = useRef<HTMLDivElement>(null);
  function jumpToColors(group: string) {
    setColorGroup(group);
    const body = panelBody.current;
    if (!body) return;
    body
      .querySelectorAll<HTMLDetailsElement>('details[data-color-group]')
      .forEach((section) => {
        section.open = section.dataset.colorGroup === group;
      });
    requestAnimationFrame(() => {
      const target = body.querySelector<HTMLElement>(
        `[data-color-group="${group}"]`,
      );
      if (target)
        body.scrollTo({
          top:
            target.getBoundingClientRect().top -
            body.getBoundingClientRect().top +
            body.scrollTop -
            16,
        });
    });
  }
  const [exportOpen, setExportOpen] = useState(false);
  const [report, setReport] = useState<ImportResult | null>(null);
  const [notice, setNotice] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState(false);
  const [installSlug, setInstallSlug] = useState<string>();
  const [copied, setCopied] = useState('');
  const importInput = useRef<HTMLInputElement>(null);
  let slugError = '';
  try {
    assertSlug(theme.slug);
  } catch (error) {
    slugError = (error as Error).message;
  }
  function updateColor(key: ColorKey, value: string, group?: string) {
    change((t) => {
      if (t.palette[key] === value) return t;
      const palette = { ...t.palette, [key]: value };
      if (key === 'selection') palette.selection_background = value;
      return { ...t, palette };
    }, group);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'İşlem tamamlanamadı.',
      });
    } finally {
      setBusy(false);
    }
  }
  async function handleImport(file?: File) {
    if (!file) return;
    await run(async () => {
      const result = await importFile(file);
      change(() => result.theme);
      setReport(result);
      setNotice({
        type: 'success',
        text: `${result.theme.name} içe aktarıldı.`,
      });
    });
  }
  async function handleImages(files: File[]) {
    await run(async () => {
      const additions = await addImages(files, theme.backgrounds);
      if (!additions.length) return;
      change((t) => ({
        ...t,
        backgrounds: [...t.backgrounds, ...additions],
        activeBackground: additions[0].id,
      }));
      setNotice({
        type: 'success',
        text: `${additions.length} arka plan eklendi.`,
      });
    });
  }
  async function handleExport(format: 'toml' | 'zip') {
    await run(async () => {
      const blob =
        format === 'toml'
          ? new Blob([exportToml(theme)], { type: 'application/toml' })
          : new Blob([await exportZip(theme)], { type: 'application/zip' });
      download(blob, format === 'toml' ? 'colors.toml' : `${theme.slug}.zip`);
      setExportOpen(false);
      setInstallSlug(theme.slug);
      setNotice({
        type: 'success',
        text: `${format === 'toml' ? 'colors.toml' : `${theme.slug}.zip`} indirildi.`,
      });
    });
  }
  function selectPreset(name: string) {
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      change((t) => ({
        ...structuredClone(preset),
        backgrounds: t.backgrounds,
        activeBackground: t.activeBackground,
      }));
      setNotice(null);
    }
  }
  async function copyColor(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setNotice({
        type: 'error',
        text: 'Renk kopyalanamadı. HEX alanından kopyalayabilirsiniz.',
      });
    }
  }
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(''), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);
  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <img src="/omarchy-logo.svg" alt="Omarchy" width="32" height="32" />
          <h1>Theme Editor</h1>
        </div>
        <div className="language-select preset-select">
          <label className="sr-only" htmlFor="language">
            {language === 'en' ? 'Language' : 'Dil'}
          </label>
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as 'en' | 'tr')}
          >
            <option value="en" lang="en">
              🇬🇧 English
            </option>
            <option value="tr" lang="tr">
              🇹🇷 Türkçe
            </option>
          </select>
          <ChevronDown size={13} />
        </div>
        <fieldset
          disabled={!ready || busy}
          className="editor-fieldset header-controls"
        >
          <div className="preset-select">
            <label className="sr-only" htmlFor="preset">
              {t('Başlangıç paleti')}
            </label>
            <select
              id="preset"
              value={
                presets.some(
                  (p) =>
                    p.name === theme.name &&
                    JSON.stringify(p.palette) === JSON.stringify(theme.palette),
                )
                  ? theme.name
                  : ''
              }
              onChange={(e) => selectPreset(e.target.value)}
            >
              <option value="" disabled>
                {t('Özel palet')}
              </option>
              {presets.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <div className="history-buttons">
            <button
              className="icon-button"
              onClick={undo}
              disabled={!canUndo}
              aria-label={t('Geri al')}
              title={t('Geri al · Ctrl+Z')}
            >
              <Undo2 size={17} />
            </button>
            <button
              className="icon-button"
              onClick={redo}
              disabled={!canRedo}
              aria-label={t('İleri al')}
              title={t('İleri al · Ctrl+Shift+Z')}
            >
              <Redo2 size={17} />
            </button>
          </div>
          <div className="header-actions">
            <div className="theme-name">
              <label className="sr-only" htmlFor="theme-name">
                {t('Tema adı')}
              </label>
              <input
                id="theme-name"
                value={theme.name}
                maxLength={100}
                placeholder={t('Benim Temam')}
                onChange={(e) =>
                  change(
                    (t) => ({
                      ...t,
                      name: e.target.value,
                      slug:
                        t.slug === slugify(t.name)
                          ? slugify(e.target.value)
                          : t.slug,
                    }),
                    'theme-name',
                  )
                }
              />
            </div>
            <div className="toolbar-actions">
              <button
                className="secondary"
                onClick={() => importInput.current?.click()}
              >
                <ArrowUpFromLine size={15} /> {t('İçe Aktar')}
              </button>
              <button className="primary" onClick={() => setExportOpen(true)}>
                <ArrowDownToLine size={15} /> {t('Dışa Aktar')}{' '}
                <ChevronDown size={13} />
              </button>
            </div>
            <input
              ref={importInput}
              className="sr-only"
              aria-label={t('Tema dosyası içe aktar')}
              type="file"
              accept=".toml,.zip"
              onChange={(e) => {
                handleImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </fieldset>
      </header>
      <main>
        <fieldset
          disabled={!ready || busy}
          className="editor-fieldset workspace-fieldset"
        >
          {notice && (
            <div
              className={`notice ${notice.type}`}
              role={notice.type === 'error' ? 'alert' : 'status'}
            >
              <span>
                {notice.type === 'error' ? (
                  <Info size={17} />
                ) : (
                  <Check size={17} />
                )}{' '}
                {t(notice.text)}
              </span>
              <button
                className="icon-button"
                aria-label={t('Mesajı kapat')}
                onClick={() => setNotice(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div
            className="mobile-switch"
            aria-label={t('Çalışma alanı görünümü')}
          >
            <button
              aria-pressed={mobileView === 'edit'}
              className={mobileView === 'edit' ? 'active' : ''}
              onClick={() => {
                setMobileView('edit');
                setSource(false);
              }}
            >
              <PaletteIcon size={14} /> {t('Düzenle')}
            </button>
            <button
              aria-pressed={mobileView === 'preview'}
              className={mobileView === 'preview' ? 'active' : ''}
              onClick={() => setMobileView('preview')}
            >
              <Layers3 size={14} /> {t('Önizle')}
            </button>
          </div>
          <div className={`workspace mobile-${mobileView}`}>
            <aside className="editor-panel">
              <nav className="panel-tabs" aria-label={t('Tema ayarları')}>
                {[
                  {
                    id: 'colors',
                    name: t('Renkler'),
                    icon: <PaletteIcon size={15} />,
                  },
                  {
                    id: 'backgrounds',
                    name: t('Arka Planlar'),
                    icon: <Image size={15} />,
                  },
                  {
                    id: 'icons',
                    name: t('İkonlar'),
                    icon: <Folder size={15} />,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={tab === item.id}
                    className={tab === item.id ? 'active' : ''}
                    onClick={() => {
                      setTab(item.id);
                      setColorGroup('primary');
                      panelBody.current?.scrollTo({ top: 0 });
                    }}
                  >
                    {item.icon}
                    {item.name}
                  </button>
                ))}
              </nav>
              {tab === 'colors' && (
                <nav
                  className="color-group-nav"
                  aria-label={t('Renk grupları')}
                >
                  {[
                    { id: 'primary', name: 'Temel renkler' },
                    { id: 'surfaces', name: 'Yüzeyler ve metin' },
                    { id: 'terminal', name: 'Terminal paleti' },
                  ].map((group) => (
                    <button
                      key={group.id}
                      aria-pressed={colorGroup === group.id}
                      onClick={() => jumpToColors(group.id)}
                    >
                      {t(group.name)}
                    </button>
                  ))}
                </nav>
              )}
              <div className="panel-body" ref={panelBody}>
                {tab === 'colors' && (
                  <>
                    <div className="section-heading" data-color-group="primary">
                      <h2>{t('Temel renkler')}</h2>
                    </div>
                    <div className="mode-control">
                      <span>{t('Görünüm modu')}</span>
                      <div>
                        <button
                          className={theme.mode === 'dark' ? 'active' : ''}
                          aria-pressed={theme.mode === 'dark'}
                          onClick={() =>
                            change((t) =>
                              t.mode === 'dark' ? t : { ...t, mode: 'dark' },
                            )
                          }
                        >
                          <Moon size={13} /> {t('Koyu')}
                        </button>
                        <button
                          className={theme.mode === 'light' ? 'active' : ''}
                          aria-pressed={theme.mode === 'light'}
                          onClick={() =>
                            change((t) =>
                              t.mode === 'light' ? t : { ...t, mode: 'light' },
                            )
                          }
                        >
                          <Sun size={13} /> {t('Açık')}
                        </button>
                      </div>
                    </div>
                    <div className="color-fields">
                      {primaryKeys.map((key) => (
                        <ColorField
                          key={key}
                          colorKey={key}
                          value={theme.palette[key]}
                          palette={theme.palette}
                          onChange={updateColor}
                        />
                      ))}
                    </div>
                    <details className="advanced" data-color-group="surfaces">
                      <summary>
                        {t('Yüzeyler ve metin')}{' '}
                        <span>
                          {surfaceKeys.length} {t('renk')}{' '}
                          <ChevronDown size={13} />
                        </span>
                      </summary>
                      <div>
                        {surfaceKeys.map((key) => (
                          <ColorField
                            key={key}
                            colorKey={key}
                            value={theme.palette[key]}
                            palette={theme.palette}
                            onChange={updateColor}
                          />
                        ))}
                      </div>
                    </details>
                    <details className="advanced" data-color-group="terminal">
                      <summary>
                        {t('Terminal paleti')}{' '}
                        <span>
                          {terminalKeys.length} {t('renk')}{' '}
                          <ChevronDown size={13} />
                        </span>
                      </summary>
                      <div>
                        {terminalKeys.map((key) => (
                          <ColorField
                            key={key}
                            colorKey={key}
                            value={theme.palette[key]}
                            palette={theme.palette}
                            onChange={updateColor}
                          />
                        ))}
                      </div>
                    </details>
                  </>
                )}
                {tab === 'backgrounds' && (
                  <Backgrounds
                    theme={theme}
                    add={handleImages}
                    select={(id) =>
                      change((t) => ({ ...t, activeBackground: id }))
                    }
                    remove={(id) =>
                      change((t) => ({
                        ...t,
                        backgrounds: t.backgrounds.filter((b) => b.id !== id),
                        activeBackground:
                          t.activeBackground === id ? null : t.activeBackground,
                      }))
                    }
                  />
                )}
                {tab === 'icons' && (
                  <>
                    <div className="section-heading">
                      <h2>{t('İkon seti')}</h2>
                    </div>
                    <div className="icon-options">
                      {iconSets.map((icon) => (
                        <button
                          key={icon}
                          className={theme.iconSet === icon ? 'selected' : ''}
                          aria-pressed={theme.iconSet === icon}
                          onClick={() =>
                            change((t) => ({ ...t, iconSet: icon }))
                          }
                        >
                          <Folder
                            style={{ color: theme.palette[iconColorKey(icon)] }}
                          />
                          <span>{icon}</span>
                          {theme.iconSet === icon && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div
                className={`save-status ${saveState.includes('medi') || saveState.includes('açılamadı') ? 'save-error' : ''}`}
                role="status"
              >
                <Check size={14} aria-hidden="true" />
                {busy ? t('Dosyalar işleniyor…') : t(saveState)}
              </div>
            </aside>
            <div className="canvas-area">
              <div className="canvas-tabs">
                <button
                  className={!source ? 'active' : ''}
                  onClick={() => setSource(false)}
                >
                  <Layers3 size={14} /> {t('Masaüstü')}
                </button>
                <button
                  className={source ? 'active' : ''}
                  onClick={() => setSource(true)}
                >
                  <Code2 size={14} /> colors.toml
                </button>
              </div>
              {source ? (
                <section
                  className="source-panel"
                  aria-label={t('colors.toml içeriği')}
                >
                  <div>
                    <Code2 size={15} /> colors.toml{' '}
                    <span>{t('Salt okunur')}</span>
                  </div>
                  <pre>
                    {slugError
                      ? t('Dışa aktarmak için geçerli bir klasör adı girin.')
                      : exportToml(theme)}
                  </pre>
                </section>
              ) : (
                <Preview theme={theme} />
              )}
              <div className="palette-overview">
                <div>
                  <h2>{t('Palet')}</h2>
                  <span role="status">
                    {copied && t('{value} kopyalandı', { value: copied })}
                  </span>
                </div>
                <div className="palette-strip">
                  {(
                    [
                      'red',
                      'orange',
                      'yellow',
                      'green',
                      'cyan',
                      'blue',
                      'magenta',
                      'foreground',
                    ] as ColorKey[]
                  ).map((key) => (
                    <button
                      key={key}
                      aria-label={t('{key} {value} kopyala', {
                        key,
                        value: theme.palette[key],
                      })}
                      title={`${key} · ${theme.palette[key]}`}
                      onClick={() => copyColor(theme.palette[key])}
                    >
                      <span style={{ background: theme.palette[key] }} />
                      <small>{theme.palette[key]}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </fieldset>
        {installSlug && (
          <div className="install-note">
            <Info size={18} />
            <div>
              <strong>{t('Tema kurulumu')}</strong>
              <p>
                {language === 'en'
                  ? 'Extract the ZIP and move the theme folder to '
                  : 'ZIP’i açıp tema klasörünü '}
                <code>~/.config/omarchy/themes/{installSlug}/</code>
                {language === 'en'
                  ? '. If you downloaded a TOML file, place '
                  : ' konumuna taşı. Tek TOML indirdiysen '}
                <code>colors.toml</code>
                {language === 'en'
                  ? ' in this folder. Then select the theme from the Omarchy theme menu.'
                  : ' dosyasını bu klasöre koy. Ardından Omarchy tema menüsünden seç.'}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label={t('Kurulum bilgisini kapat')}
              onClick={() => setInstallSlug(undefined)}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </main>
      <Modal
        open={exportOpen}
        title={t('Temanı dışa aktar')}
        onClose={() => {
          if (!busy) setExportOpen(false);
        }}
      >
        <fieldset disabled={busy} className="editor-fieldset">
          <label className="slug-label" htmlFor="theme-slug">
            {t('Tema klasörü')}
          </label>
          <input
            className="slug-input"
            id="theme-slug"
            value={theme.slug}
            maxLength={100}
            aria-invalid={!!slugError}
            aria-describedby="slug-help"
            onChange={(e) =>
              change(
                (t) => ({ ...t, slug: e.target.value.toLowerCase() }),
                'slug',
              )
            }
          />
          <p className={slugError ? 'field-error' : 'slug-help'} id="slug-help">
            {(slugError && t(slugError)) ||
              t('a–z, 0–9 ve . _ + - · boşluk ve Türkçe karakter kullanmayın.')}
          </p>
          <button
            disabled={!!slugError}
            className="export-option"
            onClick={() => handleExport('toml')}
          >
            <Code2 />
            <span>
              <strong>{t('colors.toml indir')}</strong>
              <small>
                {t('Renkler, mod ve editör bilgisi · görsel içermez')}
              </small>
            </span>
            <ArrowDownToLine size={18} />
          </button>
          <button
            disabled={!!slugError}
            className="export-option recommended"
            onClick={() => handleExport('zip')}
          >
            <Folder />
            <span>
              <strong>{t('Tema ZIP indir')}</strong>
              <small>
                colors.toml + icons.theme + {theme.backgrounds.length}{' '}
                {t('arka plan')}
              </small>
            </span>
            <ArrowDownToLine size={18} />
          </button>
        </fieldset>
        {notice?.type === 'error' && (
          <p role="alert" className="field-error">
            {t(notice.text)}
          </p>
        )}
      </Modal>
      <Modal
        open={!!report}
        title={t('İçe aktarma raporu')}
        onClose={() => setReport(null)}
      >
        {report && (
          <>
            <div className="import-summary">
              <Check size={22} />
              <div>
                <strong>{report.theme.name}</strong>
                <p>
                  {colorKeys.length} {t('renk')} ·{' '}
                  {report.theme.mode === 'light' ? t('Açık') : t('Koyu')}{' '}
                  {t('mod')} · {report.theme.backgrounds.length}{' '}
                  {t('arka plan')} · {report.theme.iconSet}
                </p>
              </div>
            </div>
            {report.warnings.map((message) => (
              <p className="report-warning" key={t(message)}>
                {t(message)}
              </p>
            ))}
            {report.ignored.length ? (
              <>
                <h3>{t('Dışarıda bırakılan dosyalar ve alanlar')}</h3>
                <ul className="ignored-list">
                  {report.ignored.map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <button className="primary wide" onClick={() => setReport(null)}>
              {t('Düzenlemeye devam et')} <ChevronDown size={14} />
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
