import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { english } from './translations';
export type Language = 'en' | 'tr';
const storageKey = 'omarchy-editor-language';
const messagePatterns = Object.entries(english)
  .filter(([source]) => source.includes('{'))
  .map(([source, target]) => {
    const names: string[] = [];
    const pattern = source
      .split(/(\{\w+\})/)
      .map((part) => {
        if (/^\{\w+\}$/.test(part)) {
          names.push(part.slice(1, -1));
          return '(.+?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    return { pattern: new RegExp(`^${pattern}$`), target, names };
  });
type Translate = (
  text: string,
  values?: Record<string, string | number>,
) => string;
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
} | null>(null);
export function translate(
  text: string,
  language: Language,
  values?: Record<string, string | number>,
): string {
  let result = language === 'en' ? (english[text] ?? text) : text;
  if (language === 'en' && !values && !english[text]) {
    for (const { pattern, target, names } of messagePatterns) {
      const match = text.match(pattern);
      if (match) {
        result = target.replace(
          /\{(\w+)\}/g,
          (_, key: string) => match[names.indexOf(key) + 1],
        );
        break;
      }
    }
  }
  if (values)
    result = result.replace(/\{(\w+)\}/g, (match, key: string) =>
      String(values[key] ?? match),
    );
  return result;
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem(storageKey) === 'tr' ? 'tr' : 'en';
    } catch {
      return 'en';
    }
  });
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* Keep the selection usable without storage. */
    }
  }, []);
  const t = useCallback<Translate>(
    (text, values) => translate(text, language, values),
    [language],
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        language === 'en'
          ? 'Edit, preview and download your theme.'
          : 'Temanı düzenle, önizle ve indir.',
      );
  }, [language]);
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is required.');
  return context;
}
