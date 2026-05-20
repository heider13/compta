// app/(cabinet)/billing/cancel/page.tsx
// Stripe redirige ici quand l'utilisateur a fermé / annulé le checkout.
// Aucune donnée n'a été modifiée — on l'invite simplement à réessayer.

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function BillingCancelPage() {
  return (
    <div
      className="app-card app-card-pad"
      style={{
        maxWidth: 520,
        margin: '40px auto',
        textAlign: 'center',
        padding: '40px 32px',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--ink-100)',
          color: 'var(--ink-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 32,
          fontWeight: 600,
        }}
        aria-hidden="true"
      >
        ×
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Paiement annulé</h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--ink-600)',
          marginBottom: 24,
          maxWidth: 400,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Vous avez annulé le paiement avant la fin du processus. Aucun montant
        n&apos;a été débité. Vous pouvez réessayer à tout moment.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Link href="/billing" className="btn btn-accent">
          Retour à la facturation
        </Link>
        <Link href="/" className="btn btn-ghost">
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
