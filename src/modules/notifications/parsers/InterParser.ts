import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

export const InterParser: BankParser = {
  parse(title: string, body: string): ParsedTransaction | null {
    const t = title.toLowerCase();
    const b = body.toLowerCase();

    // Pix recebido: "Pix recebido de Fulano - R$ 100,00"
    if (t.includes('pix recebido') || (b.includes('pix') && b.includes('recebido'))) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'income', category: 'Pix',
          amount: parseBRL(amt[1]),
          description: `Pix recebido${extractAfter(body, 'de')}`,
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Pix enviado
    if (t.includes('pix enviado') || t.includes('pix realizado') || (b.includes('pix') && (b.includes('enviado') || b.includes('realizado')))) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Pix',
          amount: -parseBRL(amt[1]),
          description: `Pix enviado${extractAfter(body, 'para')}`,
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Compra aprovada
    if (t.includes('compra aprovada') || t.includes('compra realizada') || b.includes('compra aprovada')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body) ?? /r\$\s?([\d.]+,\d{2})/i.exec(title);
      if (amt) {
        return {
          type: 'expense', category: 'Compra Crédito',
          amount: -parseBRL(amt[1]),
          description: extractMerchantInter(body) ?? 'Compra aprovada',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Débito automático / débito em conta
    if (b.includes('débito') || t.includes('débito')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Compra Débito',
          amount: -parseBRL(amt[1]),
          description: 'Débito em conta',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Transferência recebida
    if (t.includes('transferência recebida') || b.includes('transferência recebida')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'income', category: 'Transferência',
          amount: parseBRL(amt[1]),
          description: 'Transferência recebida',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Boleto pago
    if (t.includes('boleto') || b.includes('boleto')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Boleto',
          amount: -parseBRL(amt[1]),
          description: 'Pagamento de boleto',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    return null;
  },
};

function extractAfter(text: string, prep: string): string {
  const re = new RegExp(`\\b${prep}\\s+([\\w\\sÀ-ú]{2,30})(?:\\s+-|\\s+r\\$|$)`, 'i');
  const m  = re.exec(text);
  return m ? ` - ${m[1].trim()}` : '';
}

function extractMerchantInter(body: string): string | null {
  const m = /(?:em|na loja|no estabelecimento)\s+([A-Za-zÀ-ú\s&0-9]+?)(?:\s+r\$|\s+no valor|\.|$)/i.exec(body);
  return m ? m[1].trim() : null;
}
