// Hero photo des pages métier (esprit Skello) : grande photo aux coins arrondis
// sous la barre de navigation, titre et appels à l'action en blanc sur la partie
// sombre de l'image, à gauche.

import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';

export function HeroPhoto({
  image,
  cadrage = '80% 25%',
  largeurTexte = 'max-w-[36rem]',
  alt,
  kicker,
  ligne1,
  ligne2,
  sousTitre,
  points,
}: {
  image: string;
  /** Cadrage de la bande photo sous 1024 px (object-position) */
  cadrage?: string;
  /** Largeur du bloc texte (classes complètes) : plus étroite quand les personnes commencent tôt dans la photo */
  largeurTexte?: string;
  alt: string;
  kicker: string;
  ligne1: string;
  ligne2: string;
  sousTitre: string;
  points: string[];
}) {
  return (
    <section className="bg-[#fcfbff] px-3 pb-8 pt-[10rem] sm:px-5">
      {/* À partir de 1280 px : photo aux proportions d'origine (1923 × 817), texte posé sur la partie
          sombre ; le bloc grandit si le texte dépasse (le recadrage est sur le calque photo, pas sur le
          conteneur). En dessous, le texte toucherait les visages : photo en haut, texte dessous. */}
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col rounded-[24px] bg-[#1a1450] xl:aspect-[1923/817] xl:flex-row xl:items-center">
        <div aria-hidden="true" className="relative h-[250px] overflow-hidden rounded-t-[24px] sm:h-[340px] lg:h-auto lg:aspect-[1923/817] xl:absolute xl:inset-0 xl:aspect-auto xl:rounded-[24px]">
          <Image
            src={image}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1320px) 1320px, (min-width: 1024px) 100vw, 200vw"
            className="object-cover object-[var(--cadrage)] lg:object-center"
            style={{ ['--cadrage' as string]: cadrage }}
          />
          {/* Grand écran : assombrit la gauche pour le texte. Mobile : fondu vers le fond sombre du bas. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,#1a1450_100%)] lg:bg-[linear-gradient(180deg,transparent_70%,#1a1450_100%)] xl:bg-[linear-gradient(90deg,rgba(18,12,64,0.92)_0%,rgba(24,16,84,0.78)_38%,rgba(24,16,84,0.25)_62%,transparent_80%)]" />
        </div>
        <div className="relative w-full px-6 pb-10 pt-4 sm:px-10 lg:px-14 xl:py-10">
          <div className={largeurTexte}>
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold !text-white backdrop-blur-sm">
              {kicker}
            </span>
            <h1 className="!mt-5 font-[Sora] !text-[clamp(1.9rem,3vw,2.6rem)] !font-bold !leading-[1.05] !tracking-[-0.03em] !text-white">
              {ligne1}
              <br />
              <span className="bg-gradient-to-r from-[#c9b8ff] via-[#e3a8ff] to-[#ff9ed8] bg-clip-text text-transparent">{ligne2}</span>
            </h1>
            <p className="!mt-5 max-w-xl text-base !leading-relaxed !text-white/80 sm:text-lg">{sousTitre}</p>
            <ul className="mt-5 space-y-1.5">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[15px] !text-white/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#e3a8ff]" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold !text-[#1a1450] no-underline shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5">
                Créer un compte <ArrowRight className="size-4" />
              </a>
              <a href="/auth/signup" className="inline-flex items-center rounded-lg border border-white/40 bg-white/5 px-6 py-3 text-[15px] font-semibold !text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/15">
                Demander une démo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
