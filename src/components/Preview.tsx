import { useLanguage } from '../i18n';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Bell,
  Bluetooth,
  Check,
  ChevronRight,
  Code2,
  FileCode2,
  Folder,
  Maximize2,
  Minus,
  Search,
  Terminal,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import type { ColorKey, ThemeDocument } from '../theme/model';
import { ansiKeys } from '../theme/model';
import { useObjectURL } from './Backgrounds';
export function iconColorKey(iconSet: string): ColorKey {
  return (
    (
      {
        Yaru: 'orange',
        'Yaru-blue': 'blue',
        'Yaru-dark': 'muted',
        'Yaru-magenta': 'magenta',
        'Yaru-olive': 'green',
        'Yaru-prussiangreen': 'cyan',
        'Yaru-purple': 'bright_magenta',
        'Yaru-red': 'red',
        'Yaru-sage': 'bright_green',
        'Yaru-wartybrown': 'brown',
        'Yaru-yellow': 'yellow',
      } as Record<string, ColorKey>
    )[iconSet] ?? 'orange'
  );
}
function WindowTitle({
  icon,
  title,
  active,
  close,
}: {
  icon: ReactNode;
  title: string;
  active?: boolean;
  close?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className={`window-title ${active ? 'focused' : ''}`}>
      <span>
        {icon}
        {title}
      </span>
      <span className="window-actions">
        <Minus />
        <span>□</span>
        {close ? (
          <button
            aria-label={t('{title} penceresini kapat', { title })}
            onClick={close}
          >
            <X />
          </button>
        ) : (
          <X />
        )}
      </span>
    </div>
  );
}
type WindowName = 'terminal' | 'editor' | 'files' | 'notification';
export function Preview({ theme }: { theme: ThemeDocument }) {
  const { t } = useLanguage();
  const desktopRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 760px)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [menu, setMenu] = useState(false);
  const [visible, setVisible] = useState<Record<WindowName, boolean>>({
    terminal: true,
    editor: true,
    files: true,
    notification: true,
  });
  const blob = theme.backgrounds.find(
    (b) => b.id === theme.activeBackground,
  )?.blob;
  const url = useObjectURL(blob);
  const variables = Object.fromEntries(
    Object.entries(theme.palette).map(([key, value]) => [
      `--p-${key.replaceAll('_', '-')}`,
      value,
    ]),
  );
  const styles = {
    ...variables,
    '--p-icon': theme.palette[iconColorKey(theme.iconSet)],
  } as CSSProperties;
  function toggle(key: WindowName) {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  }
  return (
    <section className="preview-section" aria-label={t('Masaüstü önizlemesi')}>
      <div className="preview-heading">
        <div>
          <h2>{t('Önizleme')}</h2>
        </div>
        <button
          className="icon-button"
          aria-label={t('Önizlemeyi tam ekran aç')}
          onClick={() => {
            desktopRef.current?.requestFullscreen?.().catch(() => {});
          }}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="desktop-frame">
        <div
          key={compact ? 'compact' : 'wide'}
          className="desktop"
          style={styles}
          ref={desktopRef}
        >
          {url && (
            <img
              className="desktop-wallpaper"
              src={url}
              alt={t('Seçili masaüstü arka planı')}
            />
          )}
          {!url && (
            <div className="desktop-art" aria-hidden="true">
              <div />
              <div />
              <div />
            </div>
          )}
          <div className="desktop-bar">
            <div className="desktop-bar-left">
              <button
                className="omarchy-menu"
                aria-expanded={menu}
                aria-label={t('Uygulama menüsünü aç')}
                onClick={() => setMenu(!menu)}
              >
                ▲
              </button>
              <span className="workspace-selected">1</span>
              <span>2</span>
              <span>3</span>
              <span className="bar-divider" />
              <Terminal />
              <span>~</span>
            </div>
            <span className="bar-date">{t('04 Eki Paz · 19:42')}</span>
            <div className="desktop-tray">
              <Bluetooth />
              <Wifi />
              <Volume2 />
              <span>87%</span>
              <span className="battery">▰</span>
            </div>
          </div>
          {menu && (
            <div
              className="app-menu"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMenu(false);
              }}
            >
              <div>
                <Search /> {t('Uygulamalar')}
              </div>
              {(
                [
                  { key: 'terminal', name: 'Terminal', icon: <Terminal /> },
                  { key: 'editor', name: t('Kod editörü'), icon: <Code2 /> },
                  { key: 'files', name: t('Dosyalar'), icon: <Folder /> },
                ] as const
              ).map((app) => (
                <button
                  key={app.key}
                  onClick={() => {
                    setVisible((v) => ({ ...v, [app.key]: true }));
                    setMenu(false);
                  }}
                >
                  {app.icon}
                  {app.name}
                  <ChevronRight />
                </button>
              ))}
            </div>
          )}
          {visible.terminal && (
            <div className="preview-window terminal-window">
              <WindowTitle
                icon={<Terminal />}
                title="Terminal — ~"
                active
                close={() => toggle('terminal')}
              />
              <div className="terminal-content">
                <p>
                  <span className="p-green">❯</span>{' '}
                  <span className="p-bright">fastfetch</span>
                </p>
                <div className="fetch">
                  <pre className="fetch-logo">
                    {
                      '       /\\\n      /  \\\n     / /\\ \\\n    / /  \\ \\\n   / / /\\ \\ \\\n  /_/ /  \\ \\_\\\n      OMARCHY'
                    }
                  </pre>
                  <div className="fetch-info">
                    <strong>
                      emir<span className="p-muted">@</span>omarchy
                    </strong>
                    <span className="p-muted">────────────────────</span>
                    <p>
                      <b>OS</b> Arch Linux
                    </p>
                    <p>
                      <b>WM</b> Hyprland
                    </p>
                    <p>
                      <b>Shell</b> bash
                    </p>
                    <p>
                      <b>{t('Tema')}</b> {theme.name}
                    </p>
                    <p>
                      <b>Terminal</b> Ghostty
                    </p>
                  </div>
                </div>
                <div className="terminal-swatches">
                  {ansiKeys.map((key) => (
                    <span
                      key={key}
                      style={{ background: theme.palette[key] }}
                    />
                  ))}
                </div>
                <p className="terminal-command">
                  <span className="p-green">❯</span>{' '}
                  <span className="p-bright">echo</span>{' '}
                  <span className="p-yellow">
                    {t('"Merhaba, yeni masaüstüm."')}
                  </span>
                </p>
                <p className="p-light">{t('Merhaba, yeni masaüstüm.')}</p>
                <p className="terminal-prompt">
                  <span className="p-green">❯</span>{' '}
                  <span className="cursor-block" />
                </p>
              </div>
            </div>
          )}
          {visible.editor && (
            <div className="preview-window editor-window">
              <WindowTitle
                icon={<Code2 />}
                title="Neovim — colors.toml"
                close={() => toggle('editor')}
              />
              <div className="editor-tabs">
                <FileCode2 /> colors.toml <span>×</span>
              </div>
              <div className="code-content">
                <div className="line-numbers">
                  {Array.from({ length: 13 }, (_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <pre>
                  <span className="p-muted"># colors.toml</span>
                  {'\n'}
                  <span className="p-magenta">mode</span> ={' '}
                  <span className="p-green">"{theme.mode}"</span>
                  {'\n\n'}
                  <span className="p-magenta">accent</span> ={' '}
                  <span className="p-yellow">"{theme.palette.accent}"</span>
                  {'\n'}
                  <span className="p-magenta">background</span> ={' '}
                  <span className="p-yellow">"{theme.palette.background}"</span>
                  {'\n'}
                  <span className="p-magenta">foreground</span> ={' '}
                  <span className="p-yellow">"{theme.palette.foreground}"</span>
                  {'\n\n'}
                  <span className="p-muted">{t('# Terminal renkleri')}</span>
                  {'\n'}
                  <span className="p-magenta">red</span> ={' '}
                  <span className="p-red">"{theme.palette.red}"</span>
                  {'\n'}
                  <span className="p-magenta">green</span> ={' '}
                  <span className="p-green">"{theme.palette.green}"</span>
                  {'\n'}
                  <span className="p-magenta">blue</span> ={' '}
                  <span className="p-blue">"{theme.palette.blue}"</span>
                  {'\n\n'}
                  <span className="code-selection">
                    {'  '}
                    <span>{t('seçili metin örneği')}</span>
                    {'  '}
                  </span>
                </pre>
              </div>
              <div className="editor-status">
                <b>NORMAL</b>
                <span>colors.toml</span>
                <span>UTF-8 · TOML</span>
                <span>13:1</span>
              </div>
            </div>
          )}
          {visible.files && (
            <div className="preview-window files-window">
              <WindowTitle
                icon={<Folder />}
                title={t('Dosyalar')}
                close={() => toggle('files')}
              />
              <div className="file-path">
                ⌂ <ChevronRight /> home <ChevronRight /> emir
              </div>
              <div className="file-grid">
                {[
                  t('Belgeler'),
                  t('İndirilenler'),
                  t('Projeler'),
                  t('Resimler'),
                ].map((name) => (
                  <div key={name}>
                    <Folder className="folder-icon" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {visible.notification && (
            <div className="desktop-notification">
              <span className="notification-icon">
                <Check />
              </span>
              <div>
                <strong>{t('Tema önizlemesi')}</strong>
                <p>{t('Bildirim renkleri uygulandı.')}</p>
                <small>{t('Omarchy · şimdi')}</small>
              </div>
              <button
                aria-label={t('Bildirimi kapat')}
                onClick={() => toggle('notification')}
              >
                <X />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="preview-controls">
        <div>
          {(
            [
              { key: 'terminal', label: 'Terminal', icon: <Terminal /> },
              { key: 'editor', label: t('Editör'), icon: <Code2 /> },
              { key: 'files', label: t('Dosyalar'), icon: <Folder /> },
              { key: 'notification', label: t('Bildirim'), icon: <Bell /> },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              aria-pressed={visible[item.key]}
              className={visible[item.key] ? 'on' : ''}
              onClick={() => toggle(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
