#!/usr/bin/env bash
# Ingestion complète du corpus juridique Compta.
# À lancer sur le VPS : sudo bash -c 'set -a; source /etc/compta-proxy.env; set +a; cd /opt/compta-proxy/server/ai && bash ingest_all.sh'
#
# Sources SANS clé : EUR-Lex, BOFiP, PCG (PDF).
# Sources PISTE (nécessitent PISTE_CLIENT_ID / PISTE_CLIENT_SECRET) :
#   CGI, LPF, Code de commerce, jurisprudence Conseil d'État.
set -u
PY="./venv/bin/python"

echo "════════ EUR-Lex (sans clé) ════════"
$PY ingest.py eurlex 32006L0112   # Directive TVA 2006/112/CE

echo "════════ BOFiP (archive stock open data, sans clé) ════════"
# Filtré aux séries fiscales clés pour ne pas embarquer tout le BOFiP d'un coup.
$PY ingest.py bofip --prefix BOI-TVA,BOI-IS,BOI-BIC,BOI-BNC,BOI-RPPM,BOI-IR

echo "════════ Plan Comptable Général (PDF ANC) ════════"
$PY ingest.py pdf --source pcg --source-id ANC-2014-03 \
  --title "Plan comptable général — Règlement ANC 2014-03" \
  --path "https://www.anc.gouv.fr/files/live/sites/anc/files/contributed/ANC/1_Normes_fran%C3%A7aises/Reglements/Recueils/PCG_Janvier2025/reglement-ndeg2014-03-relatif-au-PCG-version-janvier-2025.pdf" \
  --url "https://www.anc.gouv.fr/" || echo "  (PDF PCG : URL à vérifier si échec)"

if [ -n "${PISTE_CLIENT_ID:-}" ] && [ -n "${PISTE_CLIENT_SECRET:-}" ]; then
  echo "════════ Codes Légifrance (PISTE) ════════"
  $PY ingest.py legifrance LEGITEXT000006069577 --max-articles 400   # CGI
  $PY ingest.py legifrance LEGITEXT000006069583 --max-articles 200   # LPF
  $PY ingest.py legifrance LEGITEXT000005634379 --max-articles 400   # Code de commerce

  echo "════════ Jurisprudence Conseil d'État (contentieux fiscal) ════════"
  for q in "TVA déductible" "impôt sur les sociétés abus de droit" "plus-value cession titres" "acte anormal de gestion"; do
    $PY ingest.py jurisprudence-ce "$q" --max-results 15
  done
else
  echo "⚠ PISTE_CLIENT_ID/SECRET absents — CGI, LPF, Code de commerce et jurisprudence CE non ingérés."
  echo "  Inscription : https://piste.gouv.fr (API Légifrance), puis ajouter les clés à /etc/compta-proxy.env"
fi

echo "════════ Terminé ════════"
