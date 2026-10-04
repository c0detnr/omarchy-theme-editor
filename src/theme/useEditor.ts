import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { historyReducer } from './history';
import { newTheme } from './presets';
import { loadTheme, saveTheme } from './storage';
import type { ThemeDocument } from './model';
export function useEditor() {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: newTheme(),
    future: [],
  }));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState('Çalışma yükleniyor…');
  const saveQueue = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    let mounted = true;
    loadTheme()
      .then((theme) => {
        if (!mounted) return;
        if (theme) dispatch({ type: 'restore', theme });
        setSaveState(
          theme ? 'Son çalışma geri yüklendi' : 'Tarayıcıda otomatik kayıt',
        );
      })
      .catch(() => {
        if (mounted)
          setSaveState('Kayıt açılamadı · düzenlemeye devam edebilirsiniz');
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const currentRevision = ++revision.current;
    setSaveState('Kaydediliyor…');
    // Queue saves immediately; transactions preserve edit order.
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => saveTheme(history.present))
      .then(() => {
        if (currentRevision === revision.current)
          setSaveState('Tüm değişiklikler kaydedildi');
      })
      .catch(() => {
        if (currentRevision === revision.current)
          setSaveState('Kaydedilemedi · çalışmanızı dışa aktarın');
      });
  }, [history.present, ready]);
  const change = useCallback(
    (update: (theme: ThemeDocument) => ThemeDocument, group?: string) =>
      dispatch({ type: 'change', update, group }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'y'
      ) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [undo, redo]);
  return {
    theme: history.present,
    change,
    undo,
    redo,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
    ready,
    saveState,
  };
}
