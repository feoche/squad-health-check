import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@ovhcloud/ods-react/normalize-css';
import '@ovhcloud/ods-themes/default/css';
import '@ovhcloud/ods-themes/default/fonts';
import '@fontsource-variable/outfit';
import '@fontsource-variable/nunito-sans';
import './styles/main.css';
import App from './App';
import { LANG } from './lib/i18n';

document.documentElement.lang = LANG;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
