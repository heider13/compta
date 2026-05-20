// Validation d'un numéro SIREN français.
// Règle : 9 chiffres + clé de Luhn (variante INSEE standard).
// Réf : https://entreprendre.service-public.fr/vosdroits/F32135

export function normalizeSiren(input: string): string {
  return (input ?? '').replace(/\D/g, '');
}

export function formatSiren(input: string): string {
  const d = normalizeSiren(input).slice(0, 9);
  return d.replace(/^(\d{3})(\d{0,3})(\d{0,3}).*/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(' '),
  );
}

// Algorithme de Luhn appliqué à un SIREN à 9 chiffres.
// On double un chiffre sur deux en partant de la droite, on retranche 9 si > 9,
// la somme finale doit être divisible par 10.
export function isValidSirenChecksum(siren: string): boolean {
  const digits = normalizeSiren(siren);
  if (digits.length !== 9) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits.charAt(i));
    if (Number.isNaN(n)) return false;
    // Position depuis la droite : index 8 = position 1 (non doublé)
    const positionFromRight = 9 - i;
    if (positionFromRight % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export type SirenValidation =
  | { kind: 'empty' }
  | { kind: 'too_short' }
  | { kind: 'bad_checksum' }
  | { kind: 'ok'; digits: string };

export function validateSiren(input: string): SirenValidation {
  const digits = normalizeSiren(input);
  if (digits.length === 0) return { kind: 'empty' };
  if (digits.length < 9) return { kind: 'too_short' };
  if (!isValidSirenChecksum(digits)) return { kind: 'bad_checksum' };
  return { kind: 'ok', digits };
}
