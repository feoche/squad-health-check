import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateSession from './pages/CreateSession';
import SessionPage from './pages/SessionPage';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a href="/" className="app-logo-link">
          <h1>🏥 Squad Health Check</h1>
        </a>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateSession />} />
          <Route path="/session/:code" element={<SessionPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

