import { useEffect, useState } from 'react';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { ShareButton } from '@mister-guiiug/dev-pwa-config/react/share-button';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Skeleton } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { copyToClipboard } from '@mister-guiiug/dev-pwa-config/share';
import { useI18n } from '../../i18n/index.ts';
import { inviteShareUrl } from '../../entities/invite-code.ts';

/**
 * Partage d’invitation : code monospace + QR, panneau fileté.
 */
export function InviteShare({
  code,
  expiresAt,
  onClose,
}: {
  code: string;
  expiresAt: string;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const shareUrl = inviteShareUrl(code);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void qrToDataUrl(shareUrl, {
      width: 220,
      margin: 4,
      color: { dark: '#0a1620', light: '#faf7f1' },
    })
      .then(url => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  return (
    <div className="voyage-invite-panel">
      <p className="text-muted m-0 text-sm">{t('voyage.inviteCodeLabel')}</p>
      <p className="voyage-invite-code m-0" data-testid="invite-code">
        {code}
      </p>
      <p className="text-muted m-0 text-center text-xs">
        {t('voyage.inviteExpires', {
          date: new Date(expiresAt).toLocaleDateString(),
        })}
      </p>
      {qr ? (
        <img
          src={qr}
          alt={t('voyage.inviteQrAlt')}
          className="h-52 w-52 border border-solid p-2"
          style={{
            borderColor: 'var(--voyage-ink-faint)',
            background: 'var(--dwc-surface)',
          }}
        />
      ) : (
        <Skeleton width={208} height={208} radius="md" />
      )}
      <p className="text-muted m-0 break-all text-center text-xs">{shareUrl}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <ShareButton
          title={t('app.name')}
          text={t('voyage.inviteShareText', { code })}
          url={shareUrl}
          label={t('voyage.inviteShare')}
          copiedLabel={t('voyage.inviteCopied')}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void copyToClipboard(code).then(ok => {
              if (ok) {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }
            });
          }}
        >
          {copied ? t('voyage.inviteCopied') : t('voyage.inviteCopyCode')}
        </Button>
        {onClose ? (
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('voyage.inviteClose')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
