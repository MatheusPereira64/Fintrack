import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

export const NubankParser: BankParser = {
  parse(title: string, body: string, packageName: string): ParsedTransaction | null {
    const t = title.toLowerCase();
    const b = body.toLowerCase();

    // Pix enviado: "Você enviou R$ 53,90 para João"
    const pixOutBody = /enviou\s+r\$\s?([\d.]+,\d{2})/i.exec(body);
    if (pixOutBody || t.includes('pix enviado') || (t.includes('pix') && (t.includes('enviou') || t.includes('transferi')))) {
      const amtMatch = /r\$\s?([\d.]+,\d{2})/i.exec(body) ?? /r\$\s?([\d.]+,\d{2})/i.exec(title);
      if (amtMatch) {
        return {
          type: 'expense', category: 'Pix',
          amount: -parseBRL(amtMatch[1]),
          description: `Pix enviado${extractName(body, 'para')}`,
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Pix recebido: "Você recebeu R$ 200,00 de Maria"
    const pixInBody = /recebeu\s+r\$\s?([\d.]+,\d{2})/i.exec(body);
    if (pixInBody || t.includes('pix recebido') || (t.includes('pix') && t.includes('receb'))) {
      const amtMatch = pixInBody ?? /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amtMatch) {
        return {
          type: 'income', category: 'Pix',
          amount: parseBRL(amtMatch[1]),
          description: `Pix recebido${extractName(body, 'de')}`,
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Compra aprovada: "Compra de R$ 120,00 no Mercado Livre" / "Compra aprovada"
    const purchaseMatch = /compra(?:\s+de)?\s+r\$\s?([\d.]+,\d{2})/i.exec(body)
      ?? /r\$\s?([\d.]+,\d{2})\s+(?:no|na|em)\s+(.+)/i.exec(body);
    if (purchaseMatch || t.includes('compra aprovada') || t.includes('compra no') || t.includes('compra na')) {
      const amtMatch = /r\$\s?([\d.]+,\d{2})/i.exec(body) ?? /r\$\s?([\d.]+,\d{2})/i.exec(title);
      if (amtMatch) {
        const merchant = extractMerchant(body);
        return {
          type: 'expense', category: 'Compra Crédito',
          amount: -parseBRL(amtMatch[1]),
          description: merchant ? `Compra: ${merchant}` : 'Compra no cartão',
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Débito: "R$ 45,00 debitado"
    const debitMatch = /r\$\s?([\d.]+,\d{2})\s+debitado/i.exec(body);
    if (debitMatch) {
      return {
        type: 'expense', category: 'Compra Débito',
        amount: -parseBRL(debitMatch[1]),
        description: 'Débito no cartão',
        bankName: 'Nubank', rawTitle: title, rawBody: body,
      };
    }

    // Pagamento de fatura
    if (t.includes('pagamento') && t.includes('fatura')) {
      const amtMatch = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amtMatch) {
        return {
          type: 'expense', category: 'Boleto',
          amount: -parseBRL(amtMatch[1]),
          description: 'Pagamento de fatura Nubank',
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Estorno
    if (t.includes('estorno') || b.includes('estorno')) {
      const amtMatch = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amtMatch) {
        return {
          type: 'income', category: 'Estorno',
          amount: parseBRL(amtMatch[1]),
          description: 'Estorno Nubank',
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    return null;
  },
};

function extractName(text: string, preposition: string): string {
  const regex = new RegExp(`\\b${preposition}\\s+([A-ZÀ-Ú][a-zà-ú]+(?:\\s+[A-ZÀ-Ú][a-zà-ú]+)?)`, 'i');
  const match = regex.exec(text);
  return match ? ` - ${match[1]}` : '';
}

function extractMerchant(text: string): string | null {
  const match = /(?:no|na|em|@)\s+([A-Za-zÀ-ú\s&]+?)(?:\s+r\$|\s+no dia|\s+em|\.|$)/i.exec(text);
  return match ? match[1].trim() : null;
}
