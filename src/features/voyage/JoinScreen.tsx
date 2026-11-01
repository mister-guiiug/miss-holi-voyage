import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { useI18n } from '../../i18n/index.ts';
import { coverage } from '../../backend/index.ts';
import { normalizeInviteCode } from '../../entities/invite-code.ts';
import { useVoyage } from './store.ts';
import { VoyageLink } from './VoyageLink.tsx';
import { VoyageSheet } from './VoyageSheet.tsx';

function mapInviteError(cause: unknown, needSignIn: string, invalid: string) {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/session|connectez|sign in/i.test(message)) return needSignIn;
  return invalid;
}

/**
 * Rejoindre un foyer via code court (lien profond `/rejoindre/:code` ou saisie).
 */
export function JoinScreen() {
  const { t } = useI18n();
  const { signedIn } = useAuthContext();
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const acceptInvite = useVoyage(s => s.acceptInvite);
  const load = useVoyage(s => s.load);
  const [code, setCode] = useState(
    routeCode ? normalizeInviteCode(routeCode) : ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remoteInvites = coverage.kind === 'supabase';

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
    if (remoteInvites && !signedIn) {
      setError(t('voyage.inviteNeedSignIn'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(normalized);
      navigate('/', { replace: true, viewTransition: true });
    } catch (cause) {
      setError(
        mapInviteError(
          cause,
          t('voyage.inviteNeedSignIn'),
          t('voyage.inviteInvalid')
        )
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!routeCode) return;
    if (remoteInvites && !signedIn) {
      setError(t('voyage.inviteNeedSignIn'));
      return;
    }
    let cancelled = false;
    const run = async () => {
      const normalized = normalizeInviteCode(routeCode);
      if (normalized.replace(/-/g, '').length < 8) return;
      setBusy(true);
      setError(null);
      try {
        await acceptInvite(normalized);
        if (!cancelled) navigate('/', { replace: true, viewTransition: true });
      } catch (cause) {
        if (!cancelled) {
          setError(
            mapInviteError(
              cause,
              t('voyage.inviteNeedSignIn'),
              t('voyage.inviteInvalid')
            )
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [routeCode, acceptInvite, navigate, t, remoteInvites, signedIn]);

  return (
    <VoyageSheet title={t('voyage.joinTitle')} lead={t('voyage.joinHint')}>
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
            {error}{' '}
            {error === t('voyage.inviteNeedSignIn') ? (
              <VoyageLink to="/compte" className="voyage-ink-link">
                {t('nav.account')}
              </VoyageLink>
            ) : null}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={busy || code.replace(/-/g, '').length < 8}
        >
          {t('voyage.acceptInvite')}
        </Button>
        <VoyageLink to="/" className="voyage-ink-link text-sm">
          {t('voyage.backHome')}
        </VoyageLink>
      </form>
    </VoyageSheet>
  );
}
