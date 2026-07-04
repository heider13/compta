# Corpus juridique de l'assistant IA — sources

Chaque source est indexée dans `legal_documents` / `legal_chunks` (pgvector,
embeddings Solon 1024d) et devient citable par l'assistant.

| Source | Contenu | Accès | Clé requise |
|---|---|---|---|
| **CGI** | Code général des impôts (+ annexes II, III) | Légifrance / PISTE | `PISTE_CLIENT_ID/SECRET` |
| **LPF** | Livre des procédures fiscales | Légifrance / PISTE | idem |
| **Code de commerce** | Droit des sociétés | Légifrance / PISTE | idem |
| **Jurisprudence Conseil d'État** | Contentieux fiscal (fonds CETAT) | Légifrance / PISTE | idem |
| **BOFiP** | Doctrine fiscale (BOI-*) | Open data DGFiP | aucune |
| **EUR-Lex** | Droit UE (directive TVA, etc.) | eur-lex.europa.eu | aucune |
| **PCG** | Plan comptable général (Règl. ANC 2014-03) | PDF ANC | aucune |
| **Bulletin / CNCC** | Doctrine commissariat aux comptes | documents propriétaires | upload manuel |

## Obtenir les clés PISTE (Légifrance)

1. Créer un compte sur https://piste.gouv.fr
2. Souscrire à l'**API Légifrance** (gratuite)
3. Récupérer `client_id` / `client_secret`
4. Les ajouter à `/etc/compta-proxy.env` :
   ```
   PISTE_CLIENT_ID=...
   PISTE_CLIENT_SECRET=...
   ```

## Lancer l'ingestion

Sur le VPS, venv actif, env chargé :

```bash
sudo bash -c 'set -a; source /etc/compta-proxy.env; set +a; \
  cd /opt/compta-proxy/server/ai && bash ingest_all.sh'
```

Le script ingère d'abord les sources sans clé (EUR-Lex, BOFiP, PCG), puis les
sources PISTE si les clés sont présentes.

### Ingestions unitaires

```bash
python ingest.py eurlex 32006L0112                         # directive UE
python ingest.py bofip BOI-TVA-DECLA-20-30-10              # doctrine fiscale
python ingest.py legifrance LEGITEXT000006069577 --max-articles 400   # CGI
python ingest.py jurisprudence-ce "acte anormal de gestion" --max-results 15
python ingest.py pdf --source pcg --source-id ANC-2014-03 \
  --title "PCG" --path /chemin/ou/url.pdf
```

## Bulletin CNCC (upload manuel)

Les bulletins CNCC ne sont pas en accès libre. Pour les indexer, télécharger le
PDF depuis l'espace adhérent puis :

```bash
python ingest.py pdf --source cncc --source-id BULL-CNCC-2025-01 \
  --title "Bulletin CNCC n°… — …" --path /chemin/bulletin.pdf \
  --url "https://www.cncc.fr/..."
```

## Réactualisation

Le droit change : relancer l'ingestion périodiquement (cron mensuel) écrase les
chunks existants d'un document (upsert par `source` + `source_id`).
