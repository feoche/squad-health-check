import { useState } from 'react';
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

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;
    const updated = [...categories];
    [updated[i], updated[j]] = [updated[j], updated[i]];
    onChange(updated);
  };

  const setField = (field: keyof Category, value: string) => {
    setEditForm({ ...editForm, [field]: value });
    if (errors[field as RequiredField]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const renderForm = (onSave: () => void, onCancel: () => void) => (
    <form
      className="stack"
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
      <Message color={MESSAGE_COLOR.information} dismissible={false}>
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
      <div className="inline">
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
    <div className="stack">
      {categories.map((cat, i) => {
        const { title, subtitle } = localizeCategory(cat);
        return (
          <Card
            key={i}
            className="card-body card-compact"
            color={editingIndex === i ? CARD_COLOR.primary : CARD_COLOR.neutral}
          >
            {editingIndex === i ? (
              renderForm(saveEdit, () => setEditingIndex(null))
            ) : (
              <div className="category-row">
                <Badge color={BADGE_COLOR.primary}>{i + 1}</Badge>
                <div className="grow">
                  <Text preset={TEXT_PRESET.label}>{title}</Text>
                  {subtitle && (
                    <Text preset={TEXT_PRESET.caption}> ({subtitle})</Text>
                  )}
                </div>
                <div className="inline">
                  <Button
                    size={BUTTON_SIZE.xs}
                    variant={BUTTON_VARIANT.ghost}
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={t.editor.moveUp(title)}
                  >
                    <Icon name={ICON_NAME.arrowUp} />
                  </Button>
                  <Button
                    size={BUTTON_SIZE.xs}
                    variant={BUTTON_VARIANT.ghost}
                    onClick={() => move(i, 1)}
                    disabled={i === categories.length - 1}
                    aria-label={t.editor.moveDown(title)}
                  >
                    <Icon name={ICON_NAME.arrowDown} />
                  </Button>
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
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>{t.editor.addTitle}</Text>
          {renderForm(saveAdd, () => {
            setIsAdding(false);
            setEditForm({ ...emptyCategory });
          })}
        </Card>
      ) : (
        <div>
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
