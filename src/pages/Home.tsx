import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  BUTTON_COLOR,
  BUTTON_VARIANT,
  Card,
  FormField,
  FormFieldError,
  FormFieldLabel,
  FormFieldLabelSubLabel,
  Icon,
  ICON_NAME,
  Input,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

function Home() {
  const [sessionCode, setSessionCode] = useState('');
  const [codeMissing, setCodeMissing] = useState(false);
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = sessionCode.trim().toUpperCase();
    if (!code) {
      setCodeMissing(true);
      return;
    }
    setCodeMissing(false);
    navigate(`/session/${code}`);
  };

  return (
    <div className="page page-narrow home">
      <div className="stack stack-center home__intro">
        <Text preset={TEXT_PRESET.heading2}>{t.home.welcome}</Text>
        <Text preset={TEXT_PRESET.paragraph}>{t.home.intro}</Text>
      </div>

      <div className="grid-2 home__actions">
        <Card className="card-body home__create">
          <Text preset={TEXT_PRESET.heading4}>
            <Icon name={ICON_NAME.plus} /> {t.home.createTitle}
          </Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.home.createText}</Text>
          <Button onClick={() => navigate('/create')}>{t.home.createButton}</Button>
        </Card>

        <Card className="card-body home__join">
          <Text preset={TEXT_PRESET.heading4}>
            <Icon name={ICON_NAME.chainLink} /> {t.home.joinTitle}
          </Text>
          <form className="stack home__join-form" onSubmit={handleJoin} noValidate>
            <FormField invalid={codeMissing}>
              <FormFieldLabel>
                {t.home.sessionCode}
                <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
              </FormFieldLabel>
              <Input
                placeholder={t.home.codePlaceholder}
                value={sessionCode}
                onChange={(e) => {
                  setSessionCode(e.target.value.toUpperCase());
                  setCodeMissing(false);
                }}
                maxLength={6}
              />
              <FormFieldError>{t.home.codeMissing}</FormFieldError>
            </FormField>
            <Button
              type="submit"
              color={BUTTON_COLOR.primary}
              variant={BUTTON_VARIANT.outline}
            >
              {t.home.joinButton}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="card-body home__how-it-works">
        <Text preset={TEXT_PRESET.heading4}>
          <Icon name={ICON_NAME.list} /> {t.home.howItWorks}
        </Text>
        <ol className="steps home__steps">
          {t.home.steps.map((step) => (
            <li key={step}>
              <Text preset={TEXT_PRESET.paragraph}>{step}</Text>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

export default Home;
