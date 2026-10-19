// app/(cabinet)/billing/cancel/page.tsx
// Stripe redirige ici quand l'utilisateur a fermé / annulé le checkout.
// Aucune donnée n'a été modifiée — on l'invite simplement à réessayer.

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/cabinet/PageHeader';

export const dynamic = 'force-dynamic';

export default function BillingCancelPage() {
  return (
    <PageShell className="max-w-3xl">
      <Card className="mt-6 gap-0 overflow-hidden py-0 sm:mt-10">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center">
          <span className="mb-5 grid size-12 place-items-center rounded-xl border bg-background text-muted-foreground shadow-xs">
            <XCircle className="size-5" aria-hidden="true" />
          </span>
          <p className="label-mono mb-2">Checkout interrompu</p>
          <h1 className="text-balance">Paiement annulé</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Vous avez annulé le paiement avant la fin du processus. Aucun montant
            n&apos;a été débité. Vous pouvez réessayer à tout moment.
          </p>
        </CardContent>
        <div className="flex flex-wrap justify-center gap-2 border-t bg-muted/40 px-6 py-4">
          <Button asChild size="sm">
            <Link href="/billing">Retour à la facturation</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
