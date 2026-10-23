// Page de retour après une signature intégrée (DOCUSIGN_RETURN_URL) : DocuSign y renvoie
// le signataire avec ?event=signing_complete (ou decline, cancel, ttl_expired…).
import Link from 'next/link';

export const metadata = { title: 'Signature — Legaly AI' };

const MESSAGES: Record<string, [string, string]> = {
  signing_complete: ['Signature enregistrée', 'Le document signé est transmis automatiquement au dossier. Vous pouvez fermer cet onglet.'],
  decline: ['Signature refusée', 'Le refus est enregistré dans le dossier.'],
  cancel: ['Signature reportée', 'Vous pourrez la reprendre depuis le dossier.'],
  ttl_expired: ['Lien expiré', 'Rouvrez la signature depuis le dossier pour obtenir un nouveau lien.'],
  session_timeout: ['Session expirée', 'Rouvrez la signature depuis le dossier pour obtenir un nouveau lien.'],
};

export default async function SignatureTerminee({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const [titre, texte] = MESSAGES[event ?? ''] ?? ['Signature', 'Vous pouvez fermer cet onglet et revenir au dossier.'];
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">{titre}</h1>
        <p className="mt-3 text-muted-foreground">{texte}</p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Retour à Legaly AI</Link>
      </div>
    </main>
  );
}
