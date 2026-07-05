import {
  ScanLine, Building2, FileText, PenTool, Landmark, Scale, Activity, Sparkles,
} from 'lucide-react';
import { Arrow } from '@/components/icons';

// Nœuds de la constellation = les étapes automatisées par les agents Compta.
// r = rayon (px), a = angle (deg), ring = anneau (1 interne / 2 externe).
const NODES = [
  { icon: ScanLine, label: 'OCR pièces', a: -18, r: 116, ring: 1, glow: '#ff887b' },
  { icon: Building2, label: 'Lecture SIREN', a: 210, r: 116, ring: 1, glow: '#957af5' },
  { icon: Activity, label: 'Suivi INPI', a: 100, r: 116, ring: 1, glow: '#ea42fd' },
  { icon: FileText, label: 'Statuts', a: -35, r: 196, ring: 2, glow: '#7551e8' },
  { icon: PenTool, label: 'Signature eIDAS', a: 40, r: 196, ring: 2, glow: '#ff887b' },
  { icon: Landmark, label: 'Dépôt INPI', a: 130, r: 196, ring: 2, glow: '#957af5' },
  { icon: Scale, label: 'IA juridique', a: 215, r: 196, ring: 2, glow: '#ea42fd' },
];

function nodeTransform(a: number, r: number) {
  return `translate(-50%, -50%) rotate(${a}deg) translateY(-${r}px) rotate(${-a}deg)`;
}

function Constellation() {
  const ring1 = NODES.filter((n) => n.ring === 1);
  const ring2 = NODES.filter((n) => n.ring === 2);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      {/* anneaux */}
      <div className="orbit-ring" style={{ width: '52%', height: '52%' }} />
      <div className="orbit-ring" style={{ width: '86%', height: '86%' }} />

      {/* centre */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-[Sora] text-[clamp(2.4rem,6vw,3.6rem)] font-bold leading-none text-white">
            A&nbsp;→&nbsp;Z
          </div>
          <div className="mt-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/55">
            formalités automatisées
          </div>
        </div>
      </div>

      {/* anneau interne (nœuds) */}
      <div className="orbit-layer absolute inset-0">
        {ring1.map((n) => (
          <span
            key={n.label}
            className="orbit-node absolute left-1/2 top-1/2"
            style={{ transform: nodeTransform(n.a, n.r) }}
          >
            <span
              className="orbit-keep flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-[#171233] text-white shadow-lg"
              style={{ boxShadow: `0 0 22px ${n.glow}55` }}
              title={n.label}
            >
              <n.icon className="size-5" style={{ color: n.glow }} />
            </span>
          </span>
        ))}
      </div>

      {/* anneau externe (nœuds) */}
      <div className="orbit-layer-2 absolute inset-0">
        {ring2.map((n) => (
          <span
            key={n.label}
            className="orbit-node absolute left-1/2 top-1/2"
            style={{ transform: nodeTransform(n.a, n.r) }}
          >
            <span
              className="orbit-keep flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-[#171233] text-white shadow-lg"
              style={{ boxShadow: `0 0 24px ${n.glow}55` }}
              title={n.label}
            >
              <n.icon className="size-[22px]" style={{ color: n.glow }} />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0e0b1a]">
      {/* Fond : violet profond + halo ambré (coin haut-gauche) + magenta */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 720px 620px at 6% -6%, rgba(255,190,140,0.55), transparent 55%),' +
            'radial-gradient(ellipse 1000px 800px at 60% 25%, rgba(117,81,232,0.42), transparent 62%),' +
            'radial-gradient(ellipse 800px 700px at 98% 100%, rgba(234,66,253,0.22), transparent 62%)',
        }}
      />
      {/* grille discrète */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 80%)',
        }}
      />
      {/* fondu vers le bas pour enchaîner avec les sections claires */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{ background: 'linear-gradient(to bottom, transparent, #0e0b1a)' }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-28 sm:px-10 lg:grid-cols-2 lg:pb-24 lg:pt-32">
          {/* Colonne texte */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
              <Sparkles className="size-3.5 text-[#ff887b]" />
              Plateforme d&apos;automatisation propulsée par l&apos;IA
            </span>

            <h1 className="mt-6 font-[Sora] text-[clamp(2.3rem,5vw,3.9rem)] font-bold leading-[1.05] tracking-[-0.02em] !text-white [&>span]:!text-transparent">
              Les formalités juridiques
              <br />
              que vous pensiez chronophages.
              <br />
              <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">
                Désormais en un clic.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg lg:mx-0">
              OCR des pièces, liasse INPI, statuts, signature, dépôt : une flotte
              d&apos;agents IA automatise chaque étape. Vous validez, c&apos;est tout.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0e0b1a] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Demander une démo
                <Arrow size={17} />
              </a>
              <a
                href="/#demo"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-[15px] font-medium text-white transition-colors duration-200 hover:bg-white/15"
              >
                Voir la démo
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55 lg:justify-start">
              <span>RGPD · Hébergement France</span>
              <span aria-hidden="true">•</span>
              <span>Connecté INPI Guichet Unique</span>
              <span aria-hidden="true">•</span>
              <span>Signature eIDAS intégrée</span>
            </div>
          </div>

          {/* Colonne constellation */}
          <div className="hidden lg:block">
            <Constellation />
          </div>
      </div>

      {/* Bande logos / registres officiels */}
      <div className="relative border-t border-white/10 px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold tracking-wide text-white/45 sm:justify-between">
          {['INPI Guichet Unique', 'Registre National', 'Yousign', 'Légifrance', 'Stripe'].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
