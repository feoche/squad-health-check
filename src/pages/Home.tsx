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

function Home() {
  const [sessionCode, setSessionCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = sessionCode.trim().toUpperCase();
    if (!code) {
      setCodeError('Enter the session code shared by your facilitator.');
      return;
    }
    setCodeError('');
    navigate(`/session/${code}`);
  };

  return (
    <div className="page page-narrow">
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading2}>Welcome to Squad Health Check</Text>
        <Text preset={TEXT_PRESET.paragraph}>
          Run anonymous health check sessions with your team. Vote on
          categories, discuss results, and track your squad's well-being.
        </Text>
      </div>

      <div className="grid-2">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>
            <Icon name={ICON_NAME.plus} /> Create a New Session
          </Text>
          <Text preset={TEXT_PRESET.paragraph}>
            Set up categories and invite your team
          </Text>
          <Button onClick={() => navigate('/create')}>Create Session</Button>
        </Card>

        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>
            <Icon name={ICON_NAME.chainLink} /> Join a Session
          </Text>
          <form className="stack" onSubmit={handleJoin} noValidate>
            <FormField invalid={!!codeError}>
              <FormFieldLabel>
                Session code
                <FormFieldLabelSubLabel> - mandatory</FormFieldLabelSubLabel>
              </FormFieldLabel>
              <Input
                placeholder="e.g. ABC123"
                value={sessionCode}
                onChange={(e) => {
                  setSessionCode(e.target.value.toUpperCase());
                  if (codeError) setCodeError('');
                }}
                maxLength={6}
              />
              <FormFieldError>{codeError}</FormFieldError>
            </FormField>
            <Button
              type="submit"
              color={BUTTON_COLOR.primary}
              variant={BUTTON_VARIANT.outline}
            >
              Join Session
            </Button>
          </form>
        </Card>
      </div>

      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading4}>
          <Icon name={ICON_NAME.list} /> How it works
        </Text>
        <ol className="steps">
          {[
            'The facilitator creates a session and shares the code / link',
            'Team members join using their name',
            'For each category, everyone votes a health color (green, orange, red) and a trend (improving, stable, worsening)',
            'Votes are anonymous — results show only aggregate counts',
            'After all votes are in, discuss as a team',
            'Download a recap (Markdown + PDF) at the end',
          ].map((step) => (
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
