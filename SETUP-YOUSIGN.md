# Intégration Yousign — Setup

Signature électronique avancée (eIDAS / RGS** équivalent) pour les formalités
**modification** et **cessation** INPI, qui exigent une signature au-delà de la
simple validation par mot de passe.

## Vue d'ensemble

```
Admin valide dossier (modif/cessation)
        │
        ▼
[Cabinet] /dossiers/:id/sign  ──POST──▶  VPS /api/dossiers/:id/sign-request
                                                 │
                                                 ├─ Yousign : createSignatureRequest
                                                 ├─ Yousign : uploadDocument (PDF synthèse)
                                                 ├─ Yousign : addSigner + champ signature
                                                 └─ Yousign : activate → email signataire
                                                              │
                                                              ▼
                                                       Client signe sur Yousign
                                                              │
                                                              ▼
                       VPS /api/yousign/webhook  ◀──── Yousign (signature_request.done)
                              │
                              ├─ download signed PDF
                              ├─ upload Supabase Storage (bucket dossier-docs/signed/...)
                              ├─ dossier.statut = VALIDATED_INTERNAL
                              └─ audit_logs.insert
```

## Variables d'environnement requises

À ajouter sur le **VPS OVH** (fichier `.env` du process `compta-proxy`, géré par
`pm2` / `systemd` selon l'install) :

| Variable                  | Exemple                                    | Obligatoire ? |
| ------------------------- | ------------------------------------------ | :-----------: |
| `YOUSIGN_API_KEY`         | `prod_xxxxx` ou `sandbox_xxxxx`            |       ✓       |
| `YOUSIGN_BASE_URL`        | `https://api-sandbox.yousign.app/v3`       |       ✓       |
| `YOUSIGN_WEBHOOK_SECRET`  | secret partagé pour HMAC SHA-256           |       ✓       |

En **prod**, basculer `YOUSIGN_BASE_URL` sur `https://api.yousign.app/v3`.

Côté **Vercel** (Next.js), aucune variable Yousign requise — la page de signature
relaie l'appel au VPS via `NEXT_PUBLIC_VPS_BACKEND_URL` (déjà existante).

## Création du compte sandbox

1. Créer un compte sur https://yousign.com (offre Sandbox gratuite).
2. Dashboard Yousign → **API & Webhooks** → **API keys** → générer une clé Sandbox.
3. Copier la clé dans `YOUSIGN_API_KEY` (commence par `sandbox_...`).
4. Doc API : https://developers.yousign.com/reference (v3 REST).

## Configuration du webhook

Dashboard Yousign → **API & Webhooks** → **Webhooks** → *Add endpoint* :

- **URL** : `https://vps-84ac2579.vps.ovh.net/api/yousign/webhook`
- **Subscribed events** :
  - `signature_request.done` (signé)
  - `signature_request.declined` (refusé)
  - `signature_request.expired` (expiré)
- **Secret** : générer (32+ caractères aléatoires) → coller dans
  `YOUSIGN_WEBHOOK_SECRET` côté VPS.

Le serveur **rejette** tout webhook dont la signature HMAC SHA-256 ne
correspond pas (`X-Yousign-Signature-256: sha256=<hex>`).

## Schéma DB requis

La colonne `metadata jsonb` doit exister sur `dossiers`. Si elle est absente :

```sql
alter table public.dossiers
  add column if not exists metadata jsonb default '{}'::jsonb;
```

Les clés écrites par l'intégration :

| Clé                                | Type    | Description                              |
| ---------------------------------- | ------- | ---------------------------------------- |
| `signature_request_id`             | string  | ID Yousign de la demande                 |
| `signature_provider`               | string  | `"yousign"`                              |
| `signature_status`                 | string  | `ongoing` / `signed` / `declined` / `expired` |
| `signature_signer_email`           | string  | Email du signataire                      |
| `signature_link`                   | string  | URL de signature pour le signataire      |
| `signature_source_document_id`     | uuid?   | id de `dossier_documents` source         |
| `signature_requested_at`           | iso8601 | Date d'envoi                             |
| `signature_signed_at`              | iso8601 | Date de signature (si done)              |
| `signature_signed_paths`           | text[]  | Chemins Supabase Storage des PDF signés  |

Le PDF signé est stocké dans le bucket `dossier-docs`, préfixe
`signed/{dossier_id}/{signature_request_id}-{document_id}.pdf`, et une entrée
est insérée dans `dossier_documents` (status `SIGNE`).

## Endpoints VPS exposés

| Méthode | Route                                       | Auth                  | Description                                      |
| ------- | ------------------------------------------- | --------------------- | ------------------------------------------------ |
| POST    | `/api/dossiers/:id/sign-request`            | Bearer + x-org-id     | Envoie au signataire (multi-step Yousign)        |
| GET     | `/api/dossiers/:id/sign-status`             | Bearer + x-org-id     | Récupère le statut live + cached metadata        |
| POST    | `/api/yousign/webhook`                      | HMAC-SHA256 (Yousign) | Endpoint public Yousign — pas d'auth user        |

## Test du workflow en sandbox

1. **Définir les variables d'env** (voir tableau ci-dessus) puis redémarrer le
   process VPS.
2. **Créer un dossier de test** (type `MODIFICATION` ou `RADIATION`) côté app,
   le passer en `AWAITING_VALIDATION`.
3. **Naviguer** sur `https://compta-navy.vercel.app/dossiers/<id>/sign`.
4. **Remplir** le formulaire avec une adresse email à toi → *Envoyer la
   demande de signature*.
5. **Vérifier** la réception de l'email Yousign (sandbox = email réel).
6. **Signer** sur Yousign (parcours web standard).
7. **Vérifier** :
   - Webhook reçu → logs VPS `[yousign-webhook] event_name=signature_request.done`.
   - Dossier passé à `VALIDATED_INTERNAL` côté Supabase.
   - Un nouveau document `Synthèse signée` est apparu dans
     `dossier_documents` (bucket `dossier-docs/signed/...`).
   - `audit_logs` contient la trace `dossier.signature.signature_request.done`.

## Tester rapidement le client API depuis Node

```js
process.env.YOUSIGN_API_KEY = 'sandbox_xxxxx';
process.env.YOUSIGN_BASE_URL = 'https://api-sandbox.yousign.app/v3';
const ys = require('./server/lib/yousign');

(async () => {
  const sr = await ys.createSignatureRequest({ name: 'Test Compta' });
  console.log('SR id =', sr.id, 'status =', sr.status);
})();
```

## Limitations connues / MVP

- **PDF de synthèse** : si le doc `PJ_99` n'existe pas dans `dossier_documents`,
  un PDF placeholder (1 page) est généré pour ne pas bloquer le flow. À
  remplacer par la vraie synthèse INPI dès qu'elle est exposée côté pipeline.
- **Pas de relance manuelle** dans l'UI : Yousign envoie automatiquement des
  rappels (config Yousign Dashboard). Le bouton "Rafraîchir" relit juste l'état.
- **Single signer** : on n'attache qu'un seul signataire par demande. Pour
  multi-signataires (cogérants par exemple) il faudra étendre `addSigner` et le
  formulaire.
- **Pas de push INPI automatique post-signature** : le webhook marque
  `VALIDATED_INTERNAL` mais ne déclenche pas encore l'appel INPI. À chaîner
  avec `inpi.createFormality(...)` dans le handler webhook si on veut le push
  automatique.
