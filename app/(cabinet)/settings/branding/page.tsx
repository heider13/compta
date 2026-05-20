import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateBranding } from '@/lib/server-actions/branding';
import type { WhiteLabelConfig } from '@/lib/white-label';

export default async function BrandingPage({ searchParams }: { searchParams: Promise<{ saved?: string; e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: m } = await supabase
    .from('memberships')
    .select('organization_id, organizations(name, white_label_config)')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  const org = m?.organizations as { name?: string; white_label_config?: WhiteLabelConfig } | undefined;
  const cfg: WhiteLabelConfig = org?.white_label_config || {};

  async function action(formData: FormData) {
    'use server';
    const r = await updateBranding(formData);
    redirect(r.error ? `/settings/branding?e=${encodeURIComponent(r.error)}` : '/settings/branding?saved=1');
  }

  return (
    <div className="app-content with-bg">
      <div className="page-head">
        <div>
          <h1>Marque blanche</h1>
          <p>Personnalisez l&apos;apparence de l&apos;espace pour vos clients.</p>
        </div>
      </div>

      {sp.saved && <div style={{ background: '#D1FAE5', color: '#065F46', padding: 12, marginBottom: 16, borderRadius: 8, fontSize: 13 }}>Préférences enregistrées.</div>}
      {sp.e && <div style={{ color: '#b42318', padding: 12, marginBottom: 16, fontSize: 13 }}>{sp.e}</div>}

      <form action={action} style={{ maxWidth: 640 }}>
        <div className="app-card" style={{ padding: 24, display: 'grid', gap: 14 }}>
          <Field label="Nom du cabinet (affiché)">
            <input name="company_name" defaultValue={cfg.company_name || org?.name || ''} style={inputStyle} />
          </Field>
          <Field label="URL du logo (PNG/SVG, 64×64 conseillé)">
            <input name="logo_url" type="url" defaultValue={cfg.logo_url || ''} placeholder="https://…" style={inputStyle} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Couleur principale">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input name="primary_color" type="color" defaultValue={cfg.primary_color || '#5B36D6'} style={{ width: 56, height: 40, padding: 0, border: '1px solid var(--ink-200)', borderRadius: 8, cursor: 'pointer' }} />
                <input name="primary_color" defaultValue={cfg.primary_color || '#5B36D6'} placeholder="#5B36D6" style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
            </Field>
            <Field label="Couleur secondaire (soft)">
              <input name="secondary_color" defaultValue={cfg.secondary_color || ''} placeholder="#ECE6FF" style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </Field>
          </div>
          <Field label="Domaine personnalisé (optionnel)">
            <input name="custom_domain" defaultValue={cfg.custom_domain || ''} placeholder="formalites.mon-cabinet.fr" style={inputStyle} />
            <p style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
              Configurez un CNAME vers <span className="mono">compta-navy.vercel.app</span> et ajoutez le domaine dans Vercel.
            </p>
          </Field>
          <Field label="Email d'envoi (notifications client)">
            <input name="custom_email_from" defaultValue={cfg.custom_email_from || ''} placeholder="Cabinet Dupont <contact@mon-cabinet.fr>" style={inputStyle} />
          </Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="submit" className="btn btn-accent">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="auth-label" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>{label}</label>{children}</div>;
}
