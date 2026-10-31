import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../i18n/index.ts';
import { normalizeInviteCode } from '../../entities/invite-code.ts';
import { useVoyage } from './store.ts';

/**
 * Rejoindre un foyer via code court (lien profond `/rejoindre/:code` ou saisie).
 */
export function JoinScreen() {
  const { t } = useI18n();
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const acceptInvite = useVoyage(s => s.acceptInvite);
  const load = useVoyage(s => s.load);
  const [code, setCode] = useState(
    routeCode ? normalizeInviteCode(routeCode) : ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (routeCode) setCode(normalizeInviteCode(routeCode));
  }, [routeCode]);

  const submit = async (value: string) => {
    const normalized = normalizeInviteCode(value);
    if (normalized.length < 8) {
      setError(t('voyage.inviteInvalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(normalized);
      navigate('/', { replace: true });
    } catch {
      setError(t('voyage.inviteInvalid'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!routeCode) return;
    let cancelled = false;
    const run = async () => {
      const normalized = normalizeInviteCode(routeCode);
      if (normalized.replace('-', '').length < 8) return;
      setBusy(true);
      setError(null);
      try {
        await acceptInvite(normalized);
        if (!cancelled) navigate('/', { replace: true });
      } catch {
        if (!cancelled) setError(t('voyage.inviteInvalid'));
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [routeCode, acceptInvite, navigate, t]);

  return (
    <Card>
      <CardHeader
        title={t('voyage.joinTitle')}
        subtitle={t('voyage.joinHint')}
      />
      <form
        className="flex flex-col gap-3"
        onSubmit={e => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <TextField
          label={t('voyage.inviteCodeLabel')}
          value={code}
          onChange={e => setCode(normalizeInviteCode(e.target.value))}
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
        />
        {error ? (
          <p role="alert" className="text-danger m-0 text-sm">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={busy || code.replace('-', '').length < 8}
        >
          {t('voyage.acceptInvite')}
        </Button>
        <Link to="/" className="text-sm underline-offset-2 hover:underline">
          {t('voyage.backHome')}
        </Link>
      </form>
    </Card>
  );
}
