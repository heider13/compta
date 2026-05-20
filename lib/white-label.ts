// Gestion de la marque blanche par cabinet (logo, couleurs, domaine custom)
import { createClient } from '@/lib/supabase/server';

export interface WhiteLabelConfig {
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  custom_domain?: string | null;
  custom_email_from?: string | null;
  company_name?: string | null;
}

export async function getWhiteLabelConfig(orgId: string): Promise<WhiteLabelConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations')
    .select('white_label_config, name')
    .eq('id', orgId)
    .single();
  const cfg = (data?.white_label_config as WhiteLabelConfig) || {};
  return { company_name: data?.name, ...cfg };
}

export function applyWhiteLabel(config: WhiteLabelConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  if (config.primary_color) {
    vars['--accent'] = config.primary_color;
    vars['--accent-ink'] = darken(config.primary_color, 0.25);
  }
  if (config.secondary_color) {
    vars['--accent-soft'] = config.secondary_color;
  }
  return vars;
}

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) * (1 - amount)));
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
