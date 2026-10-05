import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link as RouterLink } from 'react-router-dom';
import { Link, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import Home from './pages/Home';
import CreateSession from './pages/CreateSession';
import SessionPage from './pages/SessionPage';
import FacilitatorNotesPage from './pages/FacilitatorNotesPage';
import { HeaderSlotContext } from './components/HeaderSlot';

function App() {
  const headerRef = useRef<HTMLElement>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);

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
      <header className="app-header" ref={headerRef}>
        <Link className="app-header-brand" as={RouterLink} to="/">
          <Text preset={TEXT_PRESET.heading4} as="span">
            Squad Health Check
          </Text>
        </Link>
        <div className="app-header-slot" ref={setHeaderSlot} />
      </header>
      <main className="app-main">
        <HeaderSlotContext.Provider value={headerSlot}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateSession />} />
            <Route path="/session/:code" element={<SessionPage />} />
            <Route path="/session/:code/notes" element={<FacilitatorNotesPage />} />
          </Routes>
        </HeaderSlotContext.Provider>
      </main>
    </div>
  );
}

export default App;
