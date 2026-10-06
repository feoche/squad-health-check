import { DragEvent, useEffect, useRef, useState } from 'react';
import {
  Badge,
  BADGE_COLOR,
  Button,
  BUTTON_COLOR,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  Card,
  CARD_COLOR,
  Divider,
  FormField,
  FormFieldError,
  FormFieldLabel,
  FormFieldLabelSubLabel,
  Icon,
  ICON_NAME,
  Input,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  Textarea,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Category } from '../types';
import { LANG, t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';
import { moveItem } from '../lib/moveItem';
import { isBuiltInCategory, suggestedCategories } from '../lib/suggestedCategories';
import { loadRemovedCategories, saveRemovedCategories } from '../lib/categoryStorage';
import { defaultCategories } from '../data/defaultCategories';

interface Props {
  categories: Category[];
  onChange: (categories: Category[]) => void;
  /** Goes back to the repo default categories and forgets the stored ones */
  onReset: () => void;
}

const emptyCategory: Category = {
  name: '',
  nameFr: '',
  positiveDescription: '',
  mixedDescription: '',
  negativeDescription: '',
  positiveDescriptionFr: '',
  mixedDescriptionFr: '',
  negativeDescriptionFr: '',
};

type RequiredField = 'name' | 'positiveDescription' | 'mixedDescription' | 'negativeDescription';
type FormErrors = Partial<Record<RequiredField, string>>;

function validate(form: Category): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = t.editor.nameMissing;
  if (!form.positiveDescription.trim())
    errors.positiveDescription = t.editor.positiveMissing;
  if (!form.mixedDescription?.trim())
    errors.mixedDescription = t.editor.mixedMissing;
  if (!form.negativeDescription.trim())
    errors.negativeDescription = t.editor.negativeMissing;
  return errors;
}

function CategoryEditor({ categories, onChange, onReset }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Category>({ ...emptyCategory });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAdding, setIsAdding] = useState(false);
  /** Current position of the card being dragged; it follows the card as the list reorders */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canDrag = editingIndex === null;
  /** Categories removed from the list, so they stay among the suggestions, across visits */
  const [removed, setRemovedState] = useState<Category[]>(loadRemovedCategories);
  const setRemoved = (next: Category[]) => {
    setRemovedState(next);
    saveRemovedCategories(next);
  };
  const suggestions = suggestedCategories(categories, removed);
  /** Confirms list changes to screen readers, since the control used may disappear with them */
  const [announcement, setAnnouncement] = useState('');
  /** Selector of the element to focus after the next render, when the focused control goes away */
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusOn = (id: string) => setFocusTarget(`[data-focus="${id}"]`);

  useEffect(() => {
    if (focusTarget === null) return;
    root.current?.querySelector<HTMLElement>(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditForm({ ...categories[i] });
    setErrors({});
    setIsAdding(false);
  };

  /* Returns the cleaned category, or null (and shows field errors) if invalid */
  const validated = (): Category | null => {
    const found = validate(editForm);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFocusTarget('.category-editor__form [aria-invalid="true"]');
      return null;
    }
    return {
      ...editForm,
      nameFr: editForm.nameFr || undefined,
      positiveDescriptionFr: editForm.positiveDescriptionFr || undefined,
      mixedDescriptionFr: editForm.mixedDescriptionFr || undefined,
      negativeDescriptionFr: editForm.negativeDescriptionFr || undefined,
    };
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const category = validated();
    if (!category) return;
    const updated = [...categories];
    updated[editingIndex] = category;
    onChange(updated);
    setEditingIndex(null);
    focusOn(`edit-${editingIndex}`);
  };

  const cancelEdit = () => {
    if (editingIndex !== null) focusOn(`edit-${editingIndex}`);
    setEditingIndex(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditForm({ ...emptyCategory });
    setErrors({});
    setEditingIndex(null);
  };

  const saveAdd = () => {
    const category = validated();
    if (!category) return;
    onChange([...categories, category]);
    setIsAdding(false);
    setEditForm({ ...emptyCategory });
    setAnnouncement(t.editor.added(localizeCategory(category).title));
    focusOn('add');
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setEditForm({ ...emptyCategory });
    focusOn('add');
  };

  const remove = (i: number) => {
    setRemoved([...removed.filter((c) => c.name !== categories[i].name), categories[i]]);
    onChange(categories.filter((_, idx) => idx !== i));
    if (editingIndex === i) setEditingIndex(null);
    setAnnouncement(t.editor.removed(localizeCategory(categories[i]).title));
    // The next category takes its place, or the previous one when it was last
    focusOn(categories.length > 1 ? `edit-${Math.min(i, categories.length - 2)}` : 'add');
  };

  /** Moves a category one place with the arrow buttons, the keyboard alternative to dragging */
  const move = (i: number, delta: -1 | 1) => {
    const to = i + delta;
    onChange(moveItem(categories, i, to));
    setAnnouncement(t.editor.moved(localizeCategory(categories[i]).title, to + 1, categories.length));
    // At either end the button just used is disabled, so focus its opposite
    const atEnd = delta < 0 ? to === 0 : to === categories.length - 1;
    focusOn(`${(delta < 0) !== atEnd ? 'up' : 'down'}-${to}`);
  };

  /** Focus for when suggestion `index` leaves the list: the one taking its place, else the add button */
  const focusAfterSuggestion = (index: number) =>
    focusOn(suggestions.length > 1 ? `suggest-${Math.min(index, suggestions.length - 2)}` : 'add');

  const addSuggestion = (category: Category, index: number) => {
    onChange([...categories, category]);
    setAnnouncement(t.editor.added(localizeCategory(category).title));
    focusAfterSuggestion(index);
  };

  /** Drops a removed custom category from the suggestions for good */
  const forget = (category: Category, index: number) => {
    setRemoved(removed.filter((c) => c.name !== category.name));
    setAnnouncement(t.editor.removed(localizeCategory(category).title));
    focusAfterSuggestion(index);
  };

  const customized =
    removed.length > 0 || JSON.stringify(categories) !== JSON.stringify(defaultCategories);
  const reset = () => {
    setRemovedState([]);
    setEditingIndex(null);
    onReset();
    focusOn('add');
  };

  /* Reorders live while hovering, so the list shows where the card will land */
  const dragOver = (e: DragEvent, i: number) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (i === dragIndex) return;
    onChange(moveItem(categories, dragIndex, i));
    setDragIndex(i);
  };

  const setField = (field: keyof Category, value: string) => {
    setEditForm({ ...editForm, [field]: value });
    if (errors[field as RequiredField]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const renderForm = (onSave: () => void, onCancel: () => void) => (
    <form
      className="stack category-editor__form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <FormField invalid={!!errors.name}>
        <FormFieldLabel>
          {t.editor.name}
          <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
        </FormFieldLabel>
        <Input
          required
          value={editForm.name}
          onChange={(e) => setField('name', e.target.value)}
          autoFocus
        />
        <FormFieldError>{errors.name}</FormFieldError>
      </FormField>
      <FormField>
        <FormFieldLabel>{t.editor.nameFr}</FormFieldLabel>
        <Input
          value={editForm.nameFr || ''}
          onChange={(e) => setField('nameFr', e.target.value)}
        />
      </FormField>
      <Divider />
      <Message
        className="category-editor__hint"
        color={MESSAGE_COLOR.information}
        dismissible={false}
      >
        <MessageIcon name={ICON_NAME.circleInfo} />
        <MessageBody>{t.editor.lengthHint}</MessageBody>
      </Message>
      <FormField invalid={!!errors.positiveDescription}>
        <FormFieldLabel>
          {t.editor.positive}
          <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
        </FormFieldLabel>
        <Textarea
          required
          value={editForm.positiveDescription}
          onChange={(e) => setField('positiveDescription', e.target.value)}
          rows={2}
        />
        <FormFieldError>{errors.positiveDescription}</FormFieldError>
      </FormField>
      <FormField>
        <FormFieldLabel>{t.editor.positiveFr}</FormFieldLabel>
        <Textarea
          value={editForm.positiveDescriptionFr ?? ''}
          onChange={(e) => setField('positiveDescriptionFr', e.target.value)}
          rows={2}
        />
      </FormField>
      <FormField invalid={!!errors.mixedDescription}>
        <FormFieldLabel>
          {t.editor.mixed}
          <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
        </FormFieldLabel>
        <Textarea
          required
          value={editForm.mixedDescription ?? ''}
          onChange={(e) => setField('mixedDescription', e.target.value)}
          rows={2}
        />
        <FormFieldError>{errors.mixedDescription}</FormFieldError>
      </FormField>
      <FormField>
        <FormFieldLabel>{t.editor.mixedFr}</FormFieldLabel>
        <Textarea
          value={editForm.mixedDescriptionFr ?? ''}
          onChange={(e) => setField('mixedDescriptionFr', e.target.value)}
          rows={2}
        />
      </FormField>
      <FormField invalid={!!errors.negativeDescription}>
        <FormFieldLabel>
          {t.editor.negative}
          <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
        </FormFieldLabel>
        <Textarea
          required
          value={editForm.negativeDescription}
          onChange={(e) => setField('negativeDescription', e.target.value)}
          rows={2}
        />
        <FormFieldError>{errors.negativeDescription}</FormFieldError>
      </FormField>
      <FormField>
        <FormFieldLabel>{t.editor.negativeFr}</FormFieldLabel>
        <Textarea
          value={editForm.negativeDescriptionFr ?? ''}
          onChange={(e) => setField('negativeDescriptionFr', e.target.value)}
          rows={2}
        />
      </FormField>
      <div className="inline category-editor__form-actions">
        <Button type="submit" size={BUTTON_SIZE.sm}>
          {t.save}
        </Button>
        <Button
          type="button"
          size={BUTTON_SIZE.sm}
          variant={BUTTON_VARIANT.ghost}
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );

  /** The other language's name: the English one in French, and the reverse */
  const subtitleLang = LANG === 'fr' ? 'en' : 'fr';

  return (
    <div className="stack category-editor" ref={root}>
      <div role="status" className="visually-hidden">
        {announcement}
      </div>
      <ol className="stack category-editor__list" aria-label={t.editor.list}>
        {categories.map((cat, i) => {
          const { title, subtitle } = localizeCategory(cat);
          return (
            <li key={i} className="category-editor__list-item">
              <Card
                className={`card-body card-compact category-editor__item${
                  canDrag ? ' category-editor__item--draggable' : ''
                }${dragIndex === i ? ' category-editor__item--dragging' : ''}${
                  editingIndex === i ? ' category-editor__item--editing' : ''
                }`}
                color={editingIndex === i ? CARD_COLOR.primary : CARD_COLOR.neutral}
                draggable={canDrag}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', title);
                  setDragIndex(i);
                }}
                onDragOver={(e) => dragOver(e, i)}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={() => setDragIndex(null)}
              >
                {editingIndex === i ? (
                  renderForm(saveEdit, cancelEdit)
                ) : (
                  <div className="category-editor__row">
                    <Icon name={ICON_NAME.dragDrop} className="category-editor__drag-handle" aria-hidden />
                    <Badge className="category-editor__position" color={BADGE_COLOR.primary} aria-hidden>
                      {i + 1}
                    </Badge>
                    <div className="grow category-editor__label">
                      <Text preset={TEXT_PRESET.label}>{title}</Text>
                      {subtitle && (
                        <Text preset={TEXT_PRESET.caption}>
                          {' ('}
                          <span lang={subtitleLang}>{subtitle}</span>)
                        </Text>
                      )}
                    </div>
                    <div className="inline category-editor__item-actions">
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        disabled={!canDrag || i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={t.editor.moveUp(title)}
                        title={t.editor.moveUp(title)}
                        data-focus={`up-${i}`}
                      >
                        <Icon name={ICON_NAME.arrowUp} />
                      </Button>
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        disabled={!canDrag || i === categories.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={t.editor.moveDown(title)}
                        title={t.editor.moveDown(title)}
                        data-focus={`down-${i}`}
                      >
                        <Icon name={ICON_NAME.arrowDown} />
                      </Button>
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        onClick={() => startEdit(i)}
                        aria-label={t.editor.edit(title)}
                        title={t.editor.edit(title)}
                        data-focus={`edit-${i}`}
                      >
                        <Icon name={ICON_NAME.pen} />
                      </Button>
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        color={BUTTON_COLOR.critical}
                        onClick={() => remove(i)}
                        aria-label={t.editor.remove(title)}
                        title={t.editor.remove(title)}
                      >
                        <Icon name={ICON_NAME.trash} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      {suggestions.length > 0 && (
        <div className="stack category-editor__suggestions">
          <Text preset={TEXT_PRESET.heading5} as="h3">{t.editor.suggestions}</Text>
          <ul className="stack category-editor__list">
            {suggestions.map((cat, index) => {
              const { title, subtitle, positiveDescription } = localizeCategory(cat);
              return (
                <li key={cat.name} className="category-editor__list-item">
                  <Card className="card-body card-compact" color={CARD_COLOR.neutral}>
                    <div className="category-editor__row">
                      <div className="grow category-editor__label">
                        <Text preset={TEXT_PRESET.label}>{title}</Text>
                        {subtitle && (
                          <Text preset={TEXT_PRESET.caption}>
                            {' ('}
                            <span lang={subtitleLang}>{subtitle}</span>)
                          </Text>
                        )}
                        <Text preset={TEXT_PRESET.caption} className="category-editor__suggestion-hint">
                          {positiveDescription}
                        </Text>
                      </div>
                      <div className="inline category-editor__item-actions">
                        {!isBuiltInCategory(cat) && (
                          <Button
                            size={BUTTON_SIZE.xs}
                            variant={BUTTON_VARIANT.ghost}
                            color={BUTTON_COLOR.critical}
                            onClick={() => forget(cat, index)}
                            aria-label={t.editor.deleteSuggestion(title)}
                            title={t.editor.deleteSuggestion(title)}
                          >
                            <Icon name={ICON_NAME.trash} />
                          </Button>
                        )}
                        <Button
                          size={BUTTON_SIZE.xs}
                          variant={BUTTON_VARIANT.outline}
                          onClick={() => addSuggestion(cat, index)}
                          aria-label={t.editor.addSuggestion(title)}
                          title={t.editor.addSuggestion(title)}
                          data-focus={`suggest-${index}`}
                        >
                          <Icon name={ICON_NAME.plus} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isAdding ? (
        <Card className="card-body category-editor__new">
          <Text preset={TEXT_PRESET.heading4} as="h3">{t.editor.addTitle}</Text>
          {renderForm(saveAdd, cancelAdd)}
        </Card>
      ) : (
        <div className="inline category-editor__add">
          <Button variant={BUTTON_VARIANT.outline} onClick={startAdd} data-focus="add">
            <Icon name={ICON_NAME.plus} />
            {t.editor.add}
          </Button>
          {customized && (
            <Button variant={BUTTON_VARIANT.ghost} onClick={reset}>
              <Icon name={ICON_NAME.undo} />
              {t.editor.reset}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CategoryEditor;
