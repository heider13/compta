#!/usr/bin/env python3
"""Service d'embedding Solon (Ordalie) — écoute sur 127.0.0.1:8100.

Modèle : OrdalieTech/Solon-embeddings-large-0.1 (1024 dims, MIT).
Base e5 : les requêtes doivent être préfixées "query: " et les passages
"passage: " — géré ici via le champ `kind`.

POST /embed  {"texts": ["..."], "kind": "query"|"passage"}
  → {"embeddings": [[...1024 floats...]], "model": "...", "dim": 1024}
GET /health → {"ok": true, "model_loaded": bool}

Volontairement sans framework (http.server) : zéro dépendance au-delà de
sentence-transformers. Chargement paresseux du modèle au premier appel.
"""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL_ID = "OrdalieTech/Solon-embeddings-large-0.1"
HOST, PORT = "127.0.0.1", 8100
MAX_TEXTS = 64
MAX_CHARS = 4000  # ~512 tokens max du modèle, marge incluse

_model = None
_lock = threading.Lock()


def get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                print(f"[embed] chargement {MODEL_ID}…", flush=True)
                _model = SentenceTransformer(MODEL_ID, device="cpu")
                print("[embed] modèle prêt", flush=True)
    return _model


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True, "model_loaded": _model is not None})
        else:
            self._json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/embed":
            return self._json(404, {"error": "not_found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length))
            texts = data.get("texts") or []
            kind = data.get("kind", "query")
            if not isinstance(texts, list) or not texts:
                return self._json(400, {"error": "texts_required"})
            if len(texts) > MAX_TEXTS:
                return self._json(413, {"error": "too_many_texts", "max": MAX_TEXTS})
            prefix = "query: " if kind == "query" else "passage: "
            prepared = [prefix + str(t)[:MAX_CHARS] for t in texts]
            embs = get_model().encode(prepared, normalize_embeddings=True)
            self._json(200, {
                "embeddings": [e.tolist() for e in embs],
                "model": MODEL_ID,
                "dim": len(embs[0]) if len(embs) else 0,
            })
        except Exception as e:  # noqa: BLE001
            self._json(500, {"error": "embed_failed", "detail": str(e)[:300]})

    def log_message(self, fmt, *args):  # logs compacts
        print(f"[embed] {args[0]} {args[1]}", flush=True)


if __name__ == "__main__":
    print(f"[embed] écoute sur {HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
