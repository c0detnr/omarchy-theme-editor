import type { ThemeDocument } from './model';
export interface History {
  past: ThemeDocument[];
  present: ThemeDocument;
  future: ThemeDocument[];
  group?: string;
}
export type HistoryAction =
  | {
      type: 'change';
      update: (theme: ThemeDocument) => ThemeDocument;
      group?: string;
    }
  | { type: 'undo' | 'redo' }
  | { type: 'restore'; theme: ThemeDocument };
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === 'restore')
    return { past: [], present: action.theme, future: [] };
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future],
    };
  }
  if (action.type === 'redo') {
    if (!state.future.length) return state;
    return {
      past: [...state.past, state.present].slice(-60),
      present: state.future[0],
      future: state.future.slice(1),
    };
  }
  if (action.type !== 'change') return state;
  const next = action.update(state.present);
  if (next === state.present) return state;
  return {
    past:
      action.group && action.group === state.group
        ? state.past
        : [...state.past, state.present].slice(-60),
    present: next,
    future: [],
    group: action.group,
  };
}
