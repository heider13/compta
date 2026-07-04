"""Registre des sources juridiques à indexer pour l'assistant Compta.

Identifiants Légifrance (LEGITEXT) des codes fiscaux, comptables et
commerciaux, plus les références des textes hors-Légifrance.
"""

# Codes Légifrance (ingérés via PISTE — nécessite PISTE_CLIENT_ID/SECRET)
LEGIFRANCE_CODES = {
    "cgi": {
        "textid": "LEGITEXT000006069577",
        "label": "Code général des impôts (CGI)",
    },
    "lpf": {
        "textid": "LEGITEXT000006069583",
        "label": "Livre des procédures fiscales (LPF)",
    },
    "commerce": {
        "textid": "LEGITEXT000005634379",
        "label": "Code de commerce",
    },
    # Annexes CGI (souvent citées en fiscalité)
    "cgi_annexe2": {
        "textid": "LEGITEXT000006069568",
        "label": "Code général des impôts, annexe II",
    },
    "cgi_annexe3": {
        "textid": "LEGITEXT000006069574",
        "label": "Code général des impôts, annexe III",
    },
}

# BOFiP — open data DGFiP, sans clé (dump HTML par identifiant de document,
# ex : BOI-TVA-DECLA-40-10-20). L'ingestion BOFiP se fait par liste
# d'identifiants BOI ou via le dump complet (voir ingest.py mode bofip).
BOFIP_SEED = [
    "BOI-TVA-DECLA-20-30-10",   # franchise en base
    "BOI-BIC-DECLA-10-40",      # régime micro-BIC
    "BOI-IS-CHAMP-10",          # champ d'application de l'IS
    "BOI-RPPM-RCM",             # revenus de capitaux mobiliers
    "BOI-BNC-DECLA-10",         # régime micro-BNC
]

# Textes hors-Légifrance (PDF officiels)
PDF_SOURCES = {
    "pcg": {
        "source": "pcg",
        "source_id": "ANC-2014-03",
        "title": "Plan comptable général — Règlement ANC n° 2014-03",
        "url": "https://www.anc.gouv.fr/files/live/sites/anc/files/contributed/ANC/1_Normes_fran%C3%A7aises/Reglements/Recueils/PCG_Janvier2025/reglement-ndeg2014-03-relatif-au-PCG-version-janvier-2025.pdf",
    },
}
