import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../types';
import { defaultCategories } from '../data/defaultCategories';
import CategoryEditor from '../components/CategoryEditor';
import { createSession, describeError } from '../lib/sessionStore';

function CreateSession() {
  const [categories, setCategories] = useState<Category[]>([
    ...defaultCategories,
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (categories.length === 0) return;
    setIsCreating(true);
    setError('');
    try {
      const code = await createSession(categories);
      navigate(`/session/${code}`);
    } catch (err) {
      setError(describeError(err));
      setIsCreating(false);
    }
  };

  return (
    <div className="create-session-page">
      <h2>Create New Session</h2>
      <p className="subtitle">
        Customise the categories for your health check, then start the session.
      </p>

      <CategoryEditor categories={categories} onChange={setCategories} />

      {error && <div className="error-message">{error}</div>}

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
