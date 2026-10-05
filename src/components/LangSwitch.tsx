import { Button, BUTTON_SIZE, BUTTON_VARIANT } from '@ovhcloud/ods-react';
import { LANG, switchLang, t } from '../lib/i18n';

/** Inline SVG flags: emoji flags render as bare letters on Windows. */
const FLAGS = {
  fr: (
    <svg className="lang-switch__flag" viewBox="0 0 3 2" aria-hidden="true">
      <rect width="1" height="2" fill="#002654" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ce1126" />
    </svg>
  ),
  en: (
    <svg className="lang-switch__flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <clipPath id="lang-flag-uk">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#lang-flag-uk)" stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  ),
};

/** Navbar FR/EN swap: shows the flag of the language it switches to. */
function LangSwitch() {
  const other = LANG === 'fr' ? 'en' : 'fr';

  return (
    <Button
      className="lang-switch"
      size={BUTTON_SIZE.xs}
      variant={BUTTON_VARIANT.ghost}
      lang={other}
      aria-label={t.switchLang}
      title={t.switchLang}
      onClick={() => switchLang(other)}
    >
      {FLAGS[other]}
    </Button>
  );
}

export default LangSwitch;
