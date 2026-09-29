/**
 * Extração de parcelas em textos de notificação bancária (BR).
 * Em caso de ambiguidade, retorna null — nunca inventa valores.
 */

export interface ParsedInstallments {
  current: number;
  total: number;
}

/**
 * Detecta padrões comuns:
 * - "parcelada em 12 vezes" / "parcelado em 12x" → 1/12
 * - "em 12x" / "compra em 12x"
 * - "parcela 3/12" / "parcela 3 de 12" / "3/12"
 */
export function parseInstallments(text: string): ParsedInstallments | null {
  if (!text || !text.trim()) return null;
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // parcela 3/12 | 3/12 (barra é o formato mais inequívoco; evita dd/mm/aaaa e mm/aaaa)
  const slash =
    /parcela(?:s)?\s*(?:n[oº.]?\s*)?(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/.exec(normalized)
    ?? /\b(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)(?!\s*\/)/.exec(normalized);

  if (slash) {
    const current = Number(slash[1]);
    const total = Number(slash[2]);
    if (isValidPair(current, total)) return { current, total };
  }

  // parcela 3 de 12 | 3 de 12 parcelas (exige "parcela" no entorno)
  const de =
    /parcela(?:s)?\s*(?:n[oº.]?\s*)?(\d{1,2})\s+de\s+(\d{1,2})/.exec(normalized)
    ?? /(\d{1,2})\s+de\s+(\d{1,2})\s+parcela/.exec(normalized);

  if (de) {
    const current = Number(de[1]);
    const total = Number(de[2]);
    if (isValidPair(current, total)) return { current, total };
  }

  // parcelada em 12 vezes | parcelado em 12x | compra em 12x | em 12 vezes
  const totalOnly =
    /parcelad[oa]?\s+em\s+(\d{1,2})\s*(?:x|vezes?)/.exec(normalized)
    ?? /(?:compra|pagamento|transacao)?\s*em\s+(\d{1,2})\s*(?:x|vezes?)/.exec(normalized);

  if (totalOnly) {
    const total = Number(totalOnly[1]);
    if (isValidTotal(total)) return { current: 1, total };
  }

  return null;
}

function isValidTotal(total: number): boolean {
  return Number.isInteger(total) && total >= 2 && total <= 48;
}

function isValidPair(current: number, total: number): boolean {
  return (
    Number.isInteger(current)
    && Number.isInteger(total)
    && current >= 1
    && total >= 2
    && total <= 48
    && current <= total
  );
}
