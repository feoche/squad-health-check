import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Category } from '../types';
import { defaultCategories } from '../data/defaultCategories';
import CategoryEditor from '../components/CategoryEditor';
import { createSession, describeError } from '../lib/sessionStore';
import { t } from '../lib/i18n';

function CreateSession() {
  const [categories, setCategories] = useState<Category[]>([
    ...defaultCategories,
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [noCategories, setNoCategories] = useState(false);
  /** Kept raw and described at render time, so it follows language switches */
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (categories.length === 0) {
      setNoCategories(true);
      return;
    }
    setNoCategories(false);
    setIsCreating(true);
    setError(null);
    try {
      const code = await createSession(categories);
      navigate(`/session/${code}`);
    } catch (err) {
      setError(err);
      setIsCreating(false);
    }
  };

  return (
    <div className="page create-session">
      <div className="stack create-session__intro">
        <Text preset={TEXT_PRESET.heading2}>{t.create.title}</Text>
        <Text preset={TEXT_PRESET.paragraph}>{t.create.intro}</Text>
      </div>

      <CategoryEditor categories={categories} onChange={setCategories} />

      {(noCategories || error != null) && (
        <Message
          className="create-session__error"
          color={MESSAGE_COLOR.critical}
          dismissible={false}
        >
          <MessageIcon name={ICON_NAME.hexagonExclamation} />
          <MessageBody>{noCategories ? t.create.noCategories : describeError(error)}</MessageBody>
        </Message>
      )}

      <div className="actions create-session__actions">
        <Button onClick={handleCreate} loading={isCreating}>
          {t.create.start(categories.length)}
        </Button>
      </div>
    </div>
  );
}

export default CreateSession;
