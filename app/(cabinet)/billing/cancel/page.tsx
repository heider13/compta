// app/(cabinet)/billing/cancel/page.tsx
// Stripe redirige ici quand l'utilisateur a fermé / annulé le checkout.
// Aucune donnée n'a été modifiée — on l'invite simplement à réessayer.

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function BillingCancelPage() {
  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <Card className="mt-10">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <span className="mb-5 grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
            <XCircle className="size-9" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Paiement annulé</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Vous avez annulé le paiement avant la fin du processus. Aucun montant
            n&apos;a été débité. Vous pouvez réessayer à tout moment.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/billing">Retour à la facturation</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
