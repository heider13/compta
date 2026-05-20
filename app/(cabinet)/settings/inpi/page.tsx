import Link from 'next/link';
import {
  getInpiCredentialsStatus,
  saveInpiCredentials,
} from '@/lib/server-actions/inpi-credentials';

export const dynamic = 'force-dynamic';

const ERROR_LABELS: Record<string, string> = {
  missing_fields: 'Identifiant et mot de passe sont obligatoires.',
  no_org: 'Aucun cabinet rattaché à votre compte.',
  forbidden: 'Seul un propriétaire ou administrateur du cabinet peut modifier ces identifiants.',
};

export default async function InpiSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const status = await getInpiCredentialsStatus();
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/dashboard';
  const errorKey = sp.e ?? '';
  const errorMessage = ERROR_LABELS[errorKey] ?? (errorKey ? decodeURIComponent(errorKey) : null);

  const isReconfig = status?.configured ?? false;

  return (
    <div className="app-content with-bg">
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/dashboard" style={{ color: 'var(--ink-500)' }}>🏠</Link>
        <span>›</span>
        <Link href="/profile" style={{ color: 'var(--ink-500)' }}>Paramètres</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-900)' }}>Connexion INPI</span>
      </div>

      <div
        className="card-elev"
        style={{
          maxWidth: 640,
          margin: '20px auto',
          padding: '36px 40px',
          borderRadius: 18,
          background: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--accent-soft)',
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
              Connexion à votre compte INPI
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-500)', margin: '6px 0 0' }}>
              Vos identifiants du Guichet Unique sont nécessaires pour déposer
              les formalités au registre. Ils sont chiffrés et stockés dans votre
              cabinet uniquement — jamais partagés.
            </p>
          </div>
        </div>

        {!isReconfig && (
          <div
            style={{
              marginBottom: 22,
              padding: '12px 14px',
              background: '#FFF6E5',
              border: '1px solid #F1C75A',
              borderRadius: 10,
              fontSize: 13,
              color: '#8A5400',
            }}
          >
            <strong>Configuration requise.</strong> Tant que vos identifiants
            INPI ne sont pas renseignés, vous ne pouvez pas déposer de
            formalité depuis Compta.
          </div>
        )}

        {isReconfig && (
          <div
            style={{
              marginBottom: 22,
              padding: '12px 14px',
              background: 'rgba(19, 115, 51, 0.08)',
              border: '1px solid var(--status-green, #137333)',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--status-green, #137333)',
            }}
          >
            <strong>Compte INPI connecté</strong>
            {status?.username ? ` — ${status.username}` : ''}
            {status?.env === 'demo' ? ' (environnement bac à sable)' : ''}.
            Vous pouvez mettre à jour les identifiants ci-dessous.
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginBottom: 18,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#FDEAEA',
              color: 'var(--status-red)',
              fontSize: 13,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form action={saveInpiCredentials} style={{ display: 'grid', gap: 16 }}>
          <input type="hidden" name="next" value={next} />

          <div>
            <label htmlFor="inpi_username" style={labelStyle}>
              Identifiant INPI (email) <span style={{ color: 'var(--status-red)' }}>*</span>
            </label>
            <input
              id="inpi_username"
              name="inpi_username"
              type="email"
              required
              autoComplete="username"
              defaultValue={status?.username ?? ''}
              placeholder="vous@cabinet.fr"
              style={fieldStyle}
            />
          </div>

          <div>
            <label htmlFor="inpi_password" style={labelStyle}>
              Mot de passe INPI <span style={{ color: 'var(--status-red)' }}>*</span>
            </label>
            <input
              id="inpi_password"
              name="inpi_password"
              type="password"
              required
              autoComplete="current-password"
              placeholder={isReconfig ? 'Laissez identique pour conserver' : '••••••••'}
              style={fieldStyle}
            />
            <span style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4, display: 'block' }}>
              Le mot de passe est chiffré côté serveur avant stockage.
            </span>
          </div>

          <div>
            <label htmlFor="inpi_env" style={labelStyle}>
              Environnement
            </label>
            <select
              id="inpi_env"
              name="inpi_env"
              defaultValue={status?.env ?? 'prod'}
              style={fieldStyle}
            >
              <option value="prod">Production (procedures-bis.inpi.fr)</option>
              <option value="demo">Bac à sable / démo (procedures-demo.inpi.fr)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Link href={next} style={{ fontSize: 13, color: 'var(--ink-500)', textDecoration: 'none' }}>
              ← Annuler
            </Link>
            <button type="submit" className="btn btn-accent" style={{ minWidth: 200, justifyContent: 'center' }}>
              {isReconfig ? 'Mettre à jour' : 'Connecter mon compte INPI'}
            </button>
          </div>
        </form>

        <hr style={{ margin: '28px 0 18px', border: 0, borderTop: '1px solid var(--ink-150)' }} />
        <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.6 }}>
          <strong>Vous n&apos;avez pas encore de compte INPI ?</strong>{' '}
          Créez-le gratuitement sur{' '}
          <a
            href="https://procedures.inpi.fr/?/"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 500 }}
          >
            procedures.inpi.fr
          </a>{' '}
          puis revenez ici saisir vos identifiants.
        </div>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--ink-200)',
  background: 'white',
  fontSize: 14,
  color: 'var(--ink-900)',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink-700)',
  marginBottom: 6,
};
