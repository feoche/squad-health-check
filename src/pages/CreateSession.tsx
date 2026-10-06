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
  Quantity,
  QuantityControl,
  QuantityInput,
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
import { clearStoredCategories, loadSelectedCategories, saveSelectedCategories } from '../lib/categoryStorage';
import { DEFAULT_SESSION_SETTINGS, createSession, describeError } from '../lib/sessionStore';
import { t } from '../lib/i18n';
import {
  ASSUMED_VOTERS,
  MAX_CATEGORY_MINUTES,
  MIN_CATEGORY_MINUTES,
  formatHoursMinutes,
  formatMinutesSeconds,
  secondsPerVoter,
  workshopMinutes,
} from '../lib/roundTimer';

const isValidMinutes = (n: number) =>
  Number.isInteger(n) && n >= MIN_CATEGORY_MINUTES && n <= MAX_CATEGORY_MINUTES;

function CreateSession() {
  /** The last category choice is the default for the next sessions */
  const [categories, setCategoriesState] = useState<Category[]>(
    () => loadSelectedCategories() ?? [...defaultCategories],
  );
  const setCategories = (next: Category[]) => {
    setCategoriesState(next);
    saveSelectedCategories(next);
  };
  const resetCategories = () => {
    clearStoredCategories();
    setCategoriesState([...defaultCategories]);
  };
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
  /** Kept as typed, so the field can be cleared while editing; settings keep the last valid value */
  const [minutesText, setMinutesText] = useState(String(DEFAULT_SESSION_SETTINGS.categoryMinutes));
  const minutesInvalid = !isValidMinutes(Number(minutesText));
  const [isCreating, setIsCreating] = useState(false);
  /** Kept raw and described at render time, so it follows language switches */
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();
  const noCategories = categories.length === 0;

  const handleCreate = async () => {
    if (noCategories || minutesInvalid) return;
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

      <div className="create-session__layout">
        <CategoryEditor
          categories={categories}
          onChange={setCategories}
          onReset={resetCategories}
        />

        <Card className="card-body stack create-session__settings">
          <Text preset={TEXT_PRESET.heading4}>{t.settings.title}</Text>
          <Toggle
            checked={settings.facilitatorVotes}
            onCheckedChange={({ checked }) => setSettings((s) => ({ ...s, facilitatorVotes: checked }))}
          >
            <ToggleControl />
            <ToggleLabel>{t.settings.facilitatorVotes}</ToggleLabel>
          </Toggle>
          <FormField invalid={minutesInvalid}>
            <FormFieldLabel>{t.settings.categoryMinutes}</FormFieldLabel>
            <Quantity
              min={MIN_CATEGORY_MINUTES}
              max={MAX_CATEGORY_MINUTES}
              value={minutesText}
              onValueChange={({ value, valueAsNumber }) => {
                setMinutesText(value);
                if (isValidMinutes(valueAsNumber)) {
                  setSettings((s) => ({ ...s, categoryMinutes: valueAsNumber }));
                }
              }}
            >
              <QuantityControl>
                <QuantityInput />
              </QuantityControl>
            </Quantity>
          </FormField>
          {categories.length > 0 && (
            <Message className="create-session__time-hint" color={MESSAGE_COLOR.information} dismissible={false}>
              <MessageIcon name={ICON_NAME.circleInfo} />
              <MessageBody>
                {t.editor.timeHint(categories.length)}
                <span className="create-session__time-line">
                  {t.editor.timePerVoter(formatMinutesSeconds(secondsPerVoter(settings.categoryMinutes)))}
                </span>
                <Text preset={TEXT_PRESET.caption} className="create-session__time-example">
                  {t.editor.timeExample(
                    formatHoursMinutes(workshopMinutes(categories.length, settings.categoryMinutes)),
                    ASSUMED_VOTERS,
                  )}
                </Text>
              </MessageBody>
            </Message>
          )}
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

          <Button
            className="create-session__start"
            onClick={handleCreate}
            loading={isCreating}
            disabled={noCategories || minutesInvalid}
          >
            {t.create.start}
          </Button>
        </Card>
      </div>
    </div>
  );
}

export default CreateSession;
