import { Routes, Route, Link as RouterLink } from 'react-router-dom';
import { Link, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import Home from './pages/Home';
import CreateSession from './pages/CreateSession';
import SessionPage from './pages/SessionPage';
import FacilitatorNotesPage from './pages/FacilitatorNotesPage';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link as={RouterLink} to="/">
          <Text preset={TEXT_PRESET.heading4} as="span">
            Squad Health Check
          </Text>
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateSession />} />
          <Route path="/session/:code" element={<SessionPage />} />
          <Route path="/session/:code/notes" element={<FacilitatorNotesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
