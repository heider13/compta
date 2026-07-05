// Les modules IA de la plateforme — « la flotte d'agents ».
// Source unique consommée par le méga-menu (Nav) et la section Product Suite,
// façon Brevo (une plateforme, plusieurs solutions présentées comme des piliers).

import {
  Scale,
  Sparkles,
  ScanLine,
  FileText,
  PenTool,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export interface LandingModule {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
}

export const MODULE_LIST: LandingModule[] = [
  {
    key: 'assistant',
    icon: Scale,
    title: 'Assistant IA juridique & fiscal',
    desc: 'Un chat connecté aux sources officielles (BOFiP, CGI, Code de commerce) qui répond et cite ses sources.',
    href: '/#fonctionnalites',
  },
  {
    key: 'prefill',
    icon: Sparkles,
    title: 'Pré-remplissage intelligent',
    desc: 'Décrivez l’opération en une phrase : l’IA prépare tout le dossier à votre place.',
    href: '/#fonctionnalites',
  },
  {
    key: 'ocr',
    icon: ScanLine,
    title: 'Lecture de documents',
    desc: 'OCR des pièces d’identité, PV d’AG et statuts — PDF, image ou Word, recto/verso.',
    href: '/#fonctionnalites',
  },
  {
    key: 'docgen',
    icon: FileText,
    title: 'Génération de documents',
    desc: 'Statuts, contrats et procès-verbaux rédigés automatiquement, prêts à signer.',
    href: '/#fonctionnalites',
  },
  {
    key: 'signature',
    icon: PenTool,
    title: 'Signature électronique',
    desc: 'Signature avancée eIDAS intégrée — envoyée, suivie et archivée sans quitter la plateforme.',
    href: '/#fonctionnalites',
  },
  {
    key: 'orchestrator',
    icon: Workflow,
    title: 'Orchestrateur de formalité',
    desc: 'Une flotte d’agents pilote la formalité de A à Z. Vous validez, elle exécute.',
    href: '/#fonctionnalites',
  },
];
