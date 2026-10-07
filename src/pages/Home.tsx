import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  BUTTON_COLOR,
  BUTTON_VARIANT,
  Card,
  CARD_COLOR,
  FormField,
  FormFieldError,
  FormFieldHelper,
  FormFieldLabel,
  FormFieldLabelSubLabel,
  Icon,
  ICON_NAME,
  Input,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';

function Home() {
  const [sessionCode, setSessionCode] = useState('');
  const [codeMissing, setCodeMissing] = useState(false);
  const navigate = useNavigate();
  const codeInput = useRef<HTMLInputElement>(null);
  usePageTitle();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = sessionCode.trim().toUpperCase();
    if (!code) {
      setCodeMissing(true);
      codeInput.current?.focus();
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
        <Card className="card-body home__join" color={CARD_COLOR.neutral}>
          <Text preset={TEXT_PRESET.heading4} as="h3" className="inline">
            <Icon name={ICON_NAME.chainLink} />
            {t.home.joinTitle}
          </Text>
          <form className="stack home__join-form" onSubmit={handleJoin} noValidate>
            <FormField className="home__code-field" invalid={codeMissing}>
              <FormFieldLabel className="visually-hidden">
                {t.home.sessionCode}
                <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
              </FormFieldLabel>
              <Input
                ref={codeInput}
                required
                autoComplete="off"
                // Password managers ignore autocomplete="off": opt out of each one
                data-1p-ignore
                data-lpignore="true"
                data-bwignore
                data-form-type="other"
                // KeePassXC has no opt-out and reads "code" + 6 chars as a TOTP field;
                // it skips any input with an attribute value containing "search"
                data-kpxc-ignore="search"
                autoCapitalize="characters"
                placeholder={t.home.codePlaceholder}
                value={sessionCode}
                onChange={(e) => {
                  setSessionCode(e.target.value.toUpperCase());
                  setCodeMissing(false);
                }}
                maxLength={6}
              />
              <FormFieldHelper>
                <Text preset={TEXT_PRESET.caption}>{t.home.codeHelper}</Text>
              </FormFieldHelper>
              <FormFieldError>{t.home.codeMissing}</FormFieldError>
            </FormField>
            <Button
              className="home__card-action"
              type="submit"
              color={BUTTON_COLOR.primary}
              variant={BUTTON_VARIANT.outline}
            >
              {t.home.joinButton}
            </Button>
          </form>
        </Card>

        <Card className="card-body home__create" color={CARD_COLOR.neutral}>
          <Text preset={TEXT_PRESET.heading4} as="h3" className="inline">
            <Icon name={ICON_NAME.plus} />
            {t.home.createTitle}
          </Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.home.createText}</Text>
          <Button className="home__card-action" onClick={() => navigate('/create')}>{t.home.createButton}</Button>
        </Card>
      </div>

      <Card className="card-body home__how-it-works" color={CARD_COLOR.neutral}>
        <Text preset={TEXT_PRESET.heading4} as="h3" className="inline">
          <Icon name={ICON_NAME.list} />
          {t.home.howItWorks}
        </Text>
        <ol className="home__steps">
          {t.home.steps.map((step, i) => (
            <li key={step.title} className="home__step">
              <span className="home__step-number" aria-hidden="true">
                {i + 1}
              </span>
              <div className="home__step-body">
                <Text preset={TEXT_PRESET.heading6} as="h4">{step.title}</Text>
                <Text preset={TEXT_PRESET.paragraph}>{step.text}</Text>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

export default Home;
