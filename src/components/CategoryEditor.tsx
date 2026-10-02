import { useState } from 'react';
import { Category } from '../types';

interface Props {
  categories: Category[];
  onChange: (categories: Category[]) => void;
}

const emptyCategory: Category = {
  name: '',
  nameFr: '',
  positiveDescription: '',
  negativeDescription: '',
};

function CategoryEditor({ categories, onChange }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Category>({ ...emptyCategory });
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditForm({ ...categories[i] });
    setIsAdding(false);
  };

  const saveEdit = () => {
    if (!editForm.name.trim() || editingIndex === null) return;
    const updated = [...categories];
    updated[editingIndex] = { ...editForm, nameFr: editForm.nameFr || undefined };
    onChange(updated);
    setEditingIndex(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditForm({ ...emptyCategory });
    setEditingIndex(null);
  };

  const saveAdd = () => {
    if (!editForm.name.trim()) return;
    onChange([...categories, { ...editForm, nameFr: editForm.nameFr || undefined }]);
    setIsAdding(false);
    setEditForm({ ...emptyCategory });
  };

  const remove = (i: number) => {
    onChange(categories.filter((_, idx) => idx !== i));
    if (editingIndex === i) setEditingIndex(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;
    const updated = [...categories];
    [updated[i], updated[j]] = [updated[j], updated[i]];
    onChange(updated);
  };

  const renderForm = (onSave: () => void, onCancel: () => void) => (
    <div className="category-edit-form">
      <input
        className="input"
        placeholder="Category name *"
        value={editForm.name}
        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
        autoFocus
      />
      <input
        className="input"
        placeholder="French name (optional)"
        value={editForm.nameFr || ''}
        onChange={(e) => setEditForm({ ...editForm, nameFr: e.target.value })}
      />
      <textarea
        className="input textarea"
        placeholder="Positive description (green) *"
        value={editForm.positiveDescription}
        onChange={(e) => setEditForm({ ...editForm, positiveDescription: e.target.value })}
        rows={2}
      />
      <textarea
        className="input textarea"
        placeholder="Negative description (red) *"
        value={editForm.negativeDescription}
        onChange={(e) => setEditForm({ ...editForm, negativeDescription: e.target.value })}
        rows={2}
      />
      <div className="edit-actions">
        <button className="btn btn-small btn-primary" onClick={onSave}>
          Save
        </button>
        <button className="btn btn-small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="category-editor">
      <div className="category-list">
        {categories.map((cat, i) => (
          <div
            key={i}
            className={`category-item ${editingIndex === i ? 'editing' : ''}`}
          >
            {editingIndex === i ? (
              renderForm(saveEdit, () => setEditingIndex(null))
            ) : (
              <div className="category-display">
                <span className="category-number">{i + 1}</span>
                <div className="category-info">
                  <strong>{cat.name}</strong>
                  {cat.nameFr && (
                    <span className="category-fr"> ({cat.nameFr})</span>
                  )}
                </div>
                <div className="category-actions">
                  <button
                    className="btn-icon"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => move(i, 1)}
                    disabled={i === categories.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => startEdit(i)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => remove(i)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h4>Add New Category</h4>
          {renderForm(saveAdd, () => {
            setIsAdding(false);
            setEditForm({ ...emptyCategory });
          })}
        </div>
      ) : (
        <button
          className="btn btn-secondary"
          onClick={startAdd}
          style={{ marginTop: '1rem' }}
        >
          + Add Category
        </button>
      )}
    </div>
  );
}

export default CategoryEditor;

