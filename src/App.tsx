import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link as RouterLink, Navigate, useLocation, useParams } from 'react-router-dom';
import { Link, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import Home from './pages/Home';
import CreateSession from './pages/CreateSession';
import SessionPage from './pages/SessionPage';
import PresenterPage from './pages/PresenterPage';
import { HeaderSlotContext } from './components/HeaderSlot';
import LangSwitch from './components/LangSwitch';
import { useLang } from './lib/useLang';
import { t } from './lib/i18n';

/* The notes window became the facilitator view; old links and open popups land there */
function NotesRedirect() {
  const { code = '' } = useParams<{ code: string }>();
  return <Navigate to={`/session/${code}`} replace />;
}

function App() {
  // Messages are read at render time: a language switch re-renders the whole tree in place
  useLang();
  const headerRef = useRef<HTMLElement>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const shownPath = useRef(pathname);

  /* A route change replaces the page without a load: start keyboard and screen reader users at its top */
  useEffect(() => {
    if (pathname === shownPath.current) return;
    shownPath.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  // The header grows when its slot is filled or wraps on small screens,
  // so expose its height for the sticky elements below it
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${header.offsetHeight}px`,
      );
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // The router owns the hash, so move focus by hand instead of following the anchor
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t.skipToContent}
      </a>
      <header className="app__header" ref={headerRef}>
        <Link className="app__brand" as={RouterLink} to="/">
          <Text preset={TEXT_PRESET.heading4} as="h1">
            Squad Health Check
          </Text>
        </Link>
        <div className="app__header-slot" ref={setHeaderSlot} />
        <LangSwitch />
      </header>
      <main className="app__main" id="main" ref={mainRef} tabIndex={-1}>
        <HeaderSlotContext.Provider value={headerSlot}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateSession />} />
            <Route path="/session/:code" element={<SessionPage />} />
            <Route path="/session/:code/notes" element={<NotesRedirect />} />
            <Route path="/session/:code/present" element={<PresenterPage />} />
          </Routes>
        </HeaderSlotContext.Provider>
      </main>
    </div>
  );
}

export default App;
