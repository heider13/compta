import { redirect } from 'next/navigation';

// L'ancien orchestrateur est remplacé par les étapes de la formalité affichées sur la page
// du dossier et à droite du chat du tableau de bord : les anciens liens y mènent.
export default async function OrchestratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dossiers/${id}`);
}
