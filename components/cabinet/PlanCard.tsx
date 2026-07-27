// components/cabinet/PlanCard.tsx
// Card de plan affichée sur /billing. Sert pour les 3 plans (cabinet, pro,
// enterprise). Le bouton de souscription est un <form action={...}> qui
// pointe vers le Server Action createCheckoutSessionForm (ne nécessite donc
// pas que ce composant soit Client — il reste Server Component).
//
// Pour `enterprise` (pas de Stripe), on passe `mode="contact"` : le bouton
// devient un mailto:.

import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { createCheckoutSessionForm } from '@/lib/server-actions/billing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  planId: 'cabinet' | 'pro' | 'enterprise';
  name: string;
  description: string;
  price: string; // ex. "79 €" ou "Sur devis"
  priceSuffix?: string; // ex. " / mois HT"
  features: string[];
  highlight?: string; // badge violet en haut, ex. "Le plus choisi"
  accent?: boolean; // applique le style accent (carte centrale)
  isCurrent?: boolean; // l'org courante est déjà sur ce plan
  // Mode :
  //   - 'subscribe' (par défaut) → form action Server Action Stripe
  //   - 'contact'                → mailto: pour Enterprise
  mode?: 'subscribe' | 'contact';
  contactEmail?: string;
  disabled?: boolean; // ex. si STRIPE_PRICE_* manquant
}

export function PlanCard({
  planId,
  name,
  description,
  price,
  priceSuffix,
  features,
  highlight,
  accent = false,
  isCurrent = false,
  mode = 'subscribe',
  contactEmail = 'contact@legaly.ai',
  disabled = false,
}: PlanCardProps) {
  return (
    <Card
      className={cn(
        'relative h-full',
        accent && 'border-primary/40 bg-gradient-to-b from-accent/40 to-card shadow-md',
        isCurrent && 'ring-2 ring-primary',
        disabled && 'opacity-60',
      )}
    >
      {accent && highlight && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 px-3">
          <Sparkles className="size-3" />
          {highlight.toUpperCase()}
        </Badge>
      )}

      {isCurrent && (
        <Badge className="absolute right-4 top-4 bg-green-600 text-white hover:bg-green-600">
          Plan actuel
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="min-h-10">{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex h-full flex-col">
        <div className="mb-6 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight text-foreground">{price}</span>
          {priceSuffix && <span className="text-sm text-muted-foreground">{priceSuffix}</span>}
        </div>

        {mode === 'subscribe' && !isCurrent && (
          <form action={createCheckoutSessionForm} className="mb-6">
            <input type="hidden" name="plan" value={planId} />
            <Button
              type="submit"
              disabled={disabled}
              variant={accent ? 'default' : 'outline'}
              className="w-full"
            >
              Souscrire
              <ArrowRight className="size-4" />
            </Button>
          </form>
        )}

        {mode === 'subscribe' && isCurrent && (
          <div className="mb-6 rounded-md bg-muted px-4 py-2.5 text-center text-sm text-muted-foreground">
            Vous êtes sur ce plan
          </div>
        )}

        {mode === 'contact' && (
          <Button variant={accent ? 'default' : 'outline'} className="mb-6 w-full" asChild>
            <a href={`mailto:${contactEmail}?subject=Demande%20de%20devis%20Enterprise%20-%20Legaly%20AI`}>
              Nous contacter
              <ArrowRight className="size-4" />
            </a>
          </Button>
        )}

        <ul className="grid gap-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
