// Client SSE commun au chat public (page Indépendants et TPE) et au chat de
// l'espace entrepreneur. Le serveur conserve l'historique : le navigateur
// n'envoie que le nouveau message ou les réponses au questionnaire.

import type { FormSpec, Reponses } from '@/components/cabinet/dashboard/AgentForm';

export const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

export type Offre = {
  code: string;
  libelle: string;
  prix_ht: number;
  prix_ttc_cents: number;
  frais_officiels: string;
  inclus: string[];
  resume?: string;
  forme?: string | null;
  pourquoi?: string | null;
  provisoire?: boolean;
};

export type ItemFil =
  | { type: 'user'; text: string; files?: string[] }
  | { type: 'assistant'; text: string }
  | { type: 'form'; id: string; form: FormSpec; repondu: boolean; reponses?: Reponses | null }
  | { type: 'offre'; offre: Offre }
  | { type: 'document'; label: string; detail?: string | null }
  | { type: 'etape'; label: string; detail?: string | null; statut: 'start' | 'done' | 'error' };

export type Evenements = {
  onText?: (t: string) => void;
  onForm?: (f: FormSpec & { id: string }) => void;
  onTool?: (d: { id: string; status: 'start' | 'done' | 'error'; label: string; detail?: string; kind?: string; offre?: Offre }) => void;
  onDone?: (d: Record<string, unknown>) => void;
  onPaywall?: (d: { offre: Offre | null; raison: string }) => void;
  onError?: (detail: string) => void;
};

// POST + lecture du flux SSE (event:/data:)
export async function flux(url: string, body: unknown, ev: Evenements, token?: string) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) {
    const j = await r.json().catch(() => ({}));
    ev.onError?.(j.detail || 'L’assistant est momentanément indisponible.');
    return;
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const bloc = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = /^event: (.+)$/m.exec(bloc)?.[1];
      const data = /^data: (.+)$/m.exec(bloc)?.[1];
      if (!event || !data) continue;
      let d: any;
      try { d = JSON.parse(data); } catch { continue; }
      if (event === 'text') ev.onText?.(d.text);
      else if (event === 'form') ev.onForm?.(d);
      else if (event === 'tool') ev.onTool?.(d);
      else if (event === 'done') ev.onDone?.(d);
      else if (event === 'paywall') ev.onPaywall?.(d);
      else if (event === 'error') ev.onError?.(d.detail || 'Erreur');
    }
  }
}

export const euros = (cents: number) =>
  `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
