import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Category } from '../types';
import { defaultCategories } from '../data/defaultCategories';
import CategoryEditor from '../components/CategoryEditor';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

function CreateSession() {
  const [categories, setCategories] = useState<Category[]>([
    ...defaultCategories,
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (categories.length === 0) return;
    setIsCreating(true);

    const socket = io(SOCKET_URL);

    socket.on('connect_error', () => {
      setIsCreating(false);
      alert('Could not connect to the server. Make sure the backend is running.');
      socket.disconnect();
    });

    socket.emit(
      'create-session',
      { categories },
      (response: { success: boolean; code: string; participantId: string }) => {
        if (response.success) {
          sessionStorage.setItem(
            'shc-session',
            JSON.stringify({
              code: response.code,
              participantId: response.participantId,
              isFacilitator: true,
            }),
          );
          socket.disconnect();
          navigate(`/session/${response.code}`);
        } else {
          setIsCreating(false);
          alert('Failed to create session');
          socket.disconnect();
        }
      },
    );
  };

  return (
    <div className="create-session-page">
      <h2>Create New Session</h2>
      <p className="subtitle">
        Customise the categories for your health check, then start the session.
      </p>

      <CategoryEditor categories={categories} onChange={setCategories} />

      <div className="create-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleCreate}
          disabled={categories.length === 0 || isCreating}
        >
          {isCreating
            ? 'Creating…'
            : `Start Session (${categories.length} categories)`}
        </button>
      </div>
    </div>
  );
}

export default CreateSession;

