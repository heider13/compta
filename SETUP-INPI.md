# Intégration INPI — Setup

## Vue d'ensemble

Le frontend statique appelle des Vercel Serverless Functions (`/api/*`) qui proxy vers l'API du Guichet Unique INPI. Le compte mandataire INPI est partagé (creds dans les env vars Vercel). Chaque appel exige un JWT Supabase valide (le user doit être connecté).

```
Browser ─JWT Supabase─▶ /api/formalites ─JWT INPI─▶ INPI Guichet Unique
                                │
                                └─ Supabase Admin (DB)
```

## Variables d'environnement à ajouter sur Vercel

Vercel Dashboard → Project `compta` → Settings → Environment Variables.

| Variable                        | Exemple                                            | Obligatoire ? |
| ------------------------------- | -------------------------------------------------- | :-----------: |
| `INPI_BASE_URL`                 | `https://guichet-unique-demo.inpi.fr`              |       ✓       |
| `INPI_USERNAME`                 | ton login e-procédures INPI                        |       ✓       |
| `INPI_PASSWORD`                 | ton password e-procédures INPI                     |       ✓       |
| `SUPABASE_URL`                  | `https://dzdmwthtcmqkyalkbhbw.supabase.co`         |       ✓       |
| `SUPABASE_SERVICE_ROLE_KEY`     | service_role key (Supabase → Settings → API)       |       ✓       |

**Avant de mettre en prod** : passer `INPI_BASE_URL` à `https://guichet-unique.inpi.fr`. Les comptes démo/prod sont distincts.

## Endpoints exposés

| Méthode | Route                                       | Description                                  |
| ------- | ------------------------------------------- | -------------------------------------------- |
| GET     | `/api/inpi-status`                          | Test que la connexion INPI fonctionne        |
| GET     | `/api/formalites`                           | Liste paginée des formalités                 |
| POST    | `/api/formalites`                           | Crée une formalité (auto-entrepreneur)       |
| GET     | `/api/formalites/{id}`                      | Détail complet d'une formalité               |
| PUT     | `/api/formalites/{id}`                      | Mise à jour (avant signature)                |
| DELETE  | `/api/formalites/{id}`                      | Supprime un brouillon                        |
| POST    | `/api/formalites/{id}/sign`                 | Signe la formalité (simple pour création)    |
| GET     | `/api/formalites/{id}/attachments`          | Liste les pièces jointes                     |
| POST    | `/api/formalites/{id}/attachments`          | Ajoute une pièce (base64 PDF, ≤10Mo)         |
| GET     | `/api/formalites/{id}/synthesis`            | PDF de synthèse                              |

Tous les endpoints exigent le header `Authorization: Bearer <jwt_supabase>`.

## Tester rapidement depuis la console du navigateur

Une fois connecté sur ton app :

```js
const { data: { session } } = await window.supabaseClient.auth.getSession();
const r = await fetch('/api/inpi-status', {
  headers: { Authorization: `Bearer ${session.access_token}` }
});
console.log(await r.json());
// → { ok: true, env: "demo", totalFormalitiesIfAny: N }
```

Lister les formalités :

```js
const { data: { session } } = await window.supabaseClient.auth.getSession();
const r = await fetch('/api/formalites?itemsPerPage=10', {
  headers: { Authorization: `Bearer ${session.access_token}` }
});
console.log(await r.json());
```

## Créer une formalité de création auto-entrepreneur

Le body `content` est complexe (cf. doc INPI). Squelette minimal :

```js
{
  "companyName": "Jean Dupont",
  "typeFormalite": "C",
  "content": {
    "personnePhysique": {
      "ppRubriqueIdentiteEntreprise": {
        "identificationPersonnePhysique": { /* identité, naissance, nationalité */ },
        "blocAdresse": { /* adresse */ }
      },
      "ppRubriqueComposition": { /* options micro-fiscal */ },
      "ppRubriqueEtablissement": { /* établissement principal */ }
    }
  }
}
```

Le détail exact du JSON est sur https://guichet-unique.inpi.fr/api/docs/mandataire.

## Limitations connues du MVP

- **Pas de paiement** : nécessite un compte client INPI séparé du compte e-procédures, à brancher en phase 2.
- **Signature avancée RGS** (modif / cessation) : implémentée côté backend mais demande au client de signer le PDF avec un certificat qualifié — pas géré dans l'UI actuelle.
- **Cache token INPI** : in-memory dans la fonction Vercel, donc se réinitialise à chaque cold start. Acceptable au début (~1 login / 50min de trafic actif).
- **Compte mandataire unique** : tous les utilisateurs de Compta dépose via le même compte INPI. À découpler quand chaque user aura son propre compte mandataire.
