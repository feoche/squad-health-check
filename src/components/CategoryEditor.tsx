import { DragEvent, useState } from 'react';
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
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';
import { moveItem } from '../lib/moveItem';

interface Props {
  categories: Category[];
  onChange: (categories: Category[]) => void;
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

function CategoryEditor({ categories, onChange }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Category>({ ...emptyCategory });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAdding, setIsAdding] = useState(false);
  /** Current position of the card being dragged; it follows the card as the list reorders */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canDrag = editingIndex === null;

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
    if (Object.keys(found).length > 0) return null;
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
  };

  const remove = (i: number) => {
    onChange(categories.filter((_, idx) => idx !== i));
    if (editingIndex === i) setEditingIndex(null);
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

  return (
    <div className="stack category-editor">
      {categories.map((cat, i) => {
        const { title, subtitle } = localizeCategory(cat);
        return (
          <Card
            key={i}
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
              renderForm(saveEdit, () => setEditingIndex(null))
            ) : (
              <div className="category-editor__row">
                <Icon name={ICON_NAME.dragDrop} className="category-editor__drag-handle" aria-hidden />
                <Badge className="category-editor__position" color={BADGE_COLOR.primary}>{i + 1}</Badge>
                <div className="grow category-editor__label">
                  <Text preset={TEXT_PRESET.label}>{title}</Text>
                  {subtitle && (
                    <Text preset={TEXT_PRESET.caption}> ({subtitle})</Text>
                  )}
                </div>
                <div className="inline category-editor__item-actions">
                  <Button
                    size={BUTTON_SIZE.xs}
                    variant={BUTTON_VARIANT.ghost}
                    onClick={() => startEdit(i)}
                    aria-label={t.editor.edit(title)}
                  >
                    <Icon name={ICON_NAME.pen} />
                  </Button>
                  <Button
                    size={BUTTON_SIZE.xs}
                    variant={BUTTON_VARIANT.ghost}
                    color={BUTTON_COLOR.critical}
                    onClick={() => remove(i)}
                    aria-label={t.editor.remove(title)}
                  >
                    <Icon name={ICON_NAME.trash} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {isAdding ? (
        <Card className="card-body category-editor__new">
          <Text preset={TEXT_PRESET.heading4}>{t.editor.addTitle}</Text>
          {renderForm(saveAdd, () => {
            setIsAdding(false);
            setEditForm({ ...emptyCategory });
          })}
        </Card>
      ) : (
        <div className="category-editor__add">
          <Button variant={BUTTON_VARIANT.outline} onClick={startAdd}>
            <Icon name={ICON_NAME.plus} />
            {t.editor.add}
          </Button>
        </div>
      )}
    </div>
  );
}

export default CategoryEditor;
