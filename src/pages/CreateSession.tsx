import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  FormField,
  FormFieldLabel,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  ICON_NAME,
  Radio,
  RadioControl,
  RadioGroup,
  RadioLabel,
  Text,
  TEXT_PRESET,
  Toggle,
  ToggleControl,
  ToggleLabel,
} from '@ovhcloud/ods-react';
import { ANONYMITY_LEVELS, Anonymity, Category, SessionSettings } from '../types';
import { defaultCategories } from '../data/defaultCategories';
import CategoryEditor from '../components/CategoryEditor';
import { DEFAULT_SESSION_SETTINGS, createSession, describeError } from '../lib/sessionStore';
import { t } from '../lib/i18n';

function CreateSession() {
  const [categories, setCategories] = useState<Category[]>([
    ...defaultCategories,
  ]);
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
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
      const code = await createSession(categories, settings);
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

      <Card className="card-body stack create-session__settings">
        <Text preset={TEXT_PRESET.heading4}>{t.settings.title}</Text>
        <Toggle
          checked={settings.facilitatorVotes}
          onCheckedChange={({ checked }) => setSettings((s) => ({ ...s, facilitatorVotes: checked }))}
        >
          <ToggleControl />
          <ToggleLabel>{t.settings.facilitatorVotes}</ToggleLabel>
        </Toggle>
        <FormField>
          <FormFieldLabel>{t.settings.anonymity}</FormFieldLabel>
          <RadioGroup
            className="create-session__levels"
            value={settings.anonymity}
            onValueChange={({ value }) => setSettings((s) => ({ ...s, anonymity: value as Anonymity }))}
          >
            {ANONYMITY_LEVELS.map((level) => (
              <Radio key={level} className="create-session__level" value={level}>
                <div className="create-session__level-body">
                  <RadioControl />
                  <RadioLabel>{t.settings.levels[level]}</RadioLabel>
                  <Text preset={TEXT_PRESET.caption} className="create-session__level-hint">
                    {t.settings.levelHints[level]}
                  </Text>
                </div>
              </Radio>
            ))}
          </RadioGroup>
        </FormField>
      </Card>

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
