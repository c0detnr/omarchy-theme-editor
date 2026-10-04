import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import App from './App';
import { LanguageProvider } from './i18n';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
