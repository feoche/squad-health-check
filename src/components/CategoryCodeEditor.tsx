import { useId, useState } from 'react';
import { FormField, FormFieldError, FormFieldLabel, Text, Textarea, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category } from '../types';
import { t } from '../lib/i18n';
import { CategoryCodeError, categoriesToCode, parseCategoryCode } from '../lib/categoryCode';

interface Props {
  categories: Category[];
  onChange: (categories: Category[]) => void;
}

function describe(error: CategoryCodeError): string {
  const messages = t.editor.codeErrors;
  switch (error.kind) {
    case 'syntax':
      return messages.syntax(error.detail);
    case 'notList':
      return messages.notList;
    case 'notObject':
      return messages.notObject(error.position);
    case 'missing':
      return messages.missing(error.position, error.field);
    case 'notText':
      return messages.notText(error.position, error.field);
    case 'duplicate':
      return messages.duplicate(error.position, error.name);
  }
}

/** The categories as editable JSON: every valid version replaces the session's categories */
function CategoryCodeEditor({ categories, onChange }: Props) {
  /* Kept as typed, so half-written JSON stays on screen; it starts from the current choice */
  const [code, setCode] = useState(() => categoriesToCode(categories));
  const [error, setError] = useState<CategoryCodeError | null>(null);
  const statusId = useId();

  const edit = (next: string) => {
    setCode(next);
    const result = parseCategoryCode(next);
    if (result.ok) {
      setError(null);
      onChange(result.categories);
    } else {
      setError(result.error);
    }
  };

  return (
    <FormField className="category-code" invalid={error !== null}>
      <FormFieldLabel>{t.editor.code}</FormFieldLabel>
      <Textarea
        className="category-code__input"
        value={code}
        onChange={(e) => edit(e.target.value)}
        rows={20}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        translate="no"
        aria-describedby={error === null ? statusId : undefined}
      />
      <FormFieldError>{error && `${describe(error)} ${t.editor.codeKept(categories.length)}`}</FormFieldError>
      {error === null && (
        <Text id={statusId} preset={TEXT_PRESET.caption}>
          {t.editor.codeValid(categories.length)}
        </Text>
      )}
    </FormField>
  );
}

export default CategoryCodeEditor;
