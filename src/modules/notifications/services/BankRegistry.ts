import { BankConfig } from '../../../models/types';
import { NubankParser }    from '../parsers/NubankParser';
import { InterParser }     from '../parsers/InterParser';
import { ItauParser }      from '../parsers/ItauParser';
import { BradescoParser }  from '../parsers/BradescoParser';
import { BBParser }        from '../parsers/BBParser';
import { GenericBankParser } from '../parsers/GenericBankParser';

// Mapeamento de packageName → configuração do banco
export const BANK_REGISTRY: Record<string, BankConfig> = {
  // Nubank — package atual na Play Store
  'com.nu.production': {
    name: 'Nubank',
    packageNames: ['com.nu.production', 'com.nubank.nubank'],
    parser: NubankParser,
    primaryColor: '#820AD1',
  },
  'com.nubank.nubank': {
    name: 'Nubank',
    packageNames: ['com.nu.production', 'com.nubank.nubank'],
    parser: NubankParser,
    primaryColor: '#820AD1',
  },
  'br.com.intermedium': {
    name: 'Banco Inter',
    packageNames: ['br.com.intermedium', 'com.bancointer.banking'],
    parser: InterParser,
    primaryColor: '#FF6B00',
  },
  'com.bancointer.banking': {
    name: 'Banco Inter',
    packageNames: ['br.com.intermedium', 'com.bancointer.banking'],
    parser: InterParser,
    primaryColor: '#FF6B00',
  },
  'com.itau': {
    name: 'Itaú',
    packageNames: ['com.itau', 'com.itau.pf.android', 'com.itau.empresas', 'br.com.itau'],
    parser: ItauParser,
    primaryColor: '#EC7000',
  },
  'com.itau.pf.android': {
    name: 'Itaú',
    packageNames: ['com.itau', 'com.itau.pf.android', 'com.itau.empresas', 'br.com.itau'],
    parser: ItauParser,
    primaryColor: '#EC7000',
  },
  'com.itau.empresas': {
    name: 'Itaú',
    packageNames: ['com.itau', 'com.itau.pf.android', 'com.itau.empresas', 'br.com.itau'],
    parser: ItauParser,
    primaryColor: '#EC7000',
  },
  'br.com.itau': {
    name: 'Itaú',
    packageNames: ['com.itau', 'com.itau.pf.android', 'com.itau.empresas', 'br.com.itau'],
    parser: ItauParser,
    primaryColor: '#EC7000',
  },
  'com.bradesco': {
    name: 'Bradesco',
    packageNames: ['com.bradesco', 'com.bradesco.prime', 'br.com.bradesco'],
    parser: BradescoParser,
    primaryColor: '#CC0000',
  },
  'com.bradesco.prime': {
    name: 'Bradesco',
    packageNames: ['com.bradesco', 'com.bradesco.prime', 'br.com.bradesco'],
    parser: BradescoParser,
    primaryColor: '#CC0000',
  },
  'br.com.bradesco': {
    name: 'Bradesco',
    packageNames: ['com.bradesco', 'com.bradesco.prime', 'br.com.bradesco'],
    parser: BradescoParser,
    primaryColor: '#CC0000',
  },
  'com.bb.android': {
    name: 'Banco do Brasil',
    packageNames: ['com.bb.android', 'br.com.bb.android'],
    parser: BBParser,
    primaryColor: '#FFD700',
  },
  'br.com.bb.android': {
    name: 'Banco do Brasil',
    packageNames: ['com.bb.android', 'br.com.bb.android'],
    parser: BBParser,
    primaryColor: '#FFD700',
  },
  'com.santander.app': {
    name: 'Santander',
    packageNames: ['com.santander.app', 'com.santander.way'],
    parser: GenericBankParser,
    primaryColor: '#EC0000',
  },
  'com.santander.way': {
    name: 'Santander',
    packageNames: ['com.santander.app', 'com.santander.way'],
    parser: GenericBankParser,
    primaryColor: '#EC0000',
  },
  'br.com.c6bank.app': {
    name: 'C6 Bank',
    packageNames: ['br.com.c6bank.app', 'com.c6bank.app'],
    parser: GenericBankParser,
    primaryColor: '#1C1C1C',
  },
  'com.c6bank.app': {
    name: 'C6 Bank',
    packageNames: ['br.com.c6bank.app', 'com.c6bank.app'],
    parser: GenericBankParser,
    primaryColor: '#1C1C1C',
  },
  'br.gov.caixa.internet.smartphones': {
    name: 'Caixa Econômica',
    packageNames: ['br.gov.caixa.internet.smartphones', 'br.gov.caixa.internet', 'br.com.gabba.Caixa'],
    parser: GenericBankParser,
    primaryColor: '#006FB4',
  },
  'br.gov.caixa.internet': {
    name: 'Caixa Econômica',
    packageNames: ['br.gov.caixa.internet.smartphones', 'br.gov.caixa.internet', 'br.com.gabba.Caixa'],
    parser: GenericBankParser,
    primaryColor: '#006FB4',
  },
  'br.com.gabba.Caixa': {
    name: 'Caixa Econômica',
    packageNames: ['br.gov.caixa.internet.smartphones', 'br.gov.caixa.internet', 'br.com.gabba.Caixa'],
    parser: GenericBankParser,
    primaryColor: '#006FB4',
  },
  'com.mercadopago.wallet': {
    name: 'Mercado Pago',
    packageNames: ['com.mercadopago.wallet'],
    parser: GenericBankParser,
    primaryColor: '#009EE3',
  },
  'com.picpay': {
    name: 'PicPay',
    packageNames: ['com.picpay'],
    parser: GenericBankParser,
    primaryColor: '#21C25E',
  },
  'br.com.bradesco.next': {
    name: 'Next',
    packageNames: ['br.com.bradesco.next'],
    parser: GenericBankParser,
    primaryColor: '#00E5B4',
  },
  'br.com.original.bank': {
    name: 'Banco Original',
    packageNames: ['br.com.original.bank'],
    parser: GenericBankParser,
    primaryColor: '#00A13A',
  },
  'br.com.uol.ps.myaccount': {
    name: 'PagBank',
    packageNames: ['br.com.uol.ps.myaccount'],
    parser: GenericBankParser,
    primaryColor: '#03C759',
  },
  'br.com.neon.app': {
    name: 'Neon',
    packageNames: ['br.com.neon.app', 'com.neon.bank.android.prd'],
    parser: GenericBankParser,
    primaryColor: '#00CFBD',
  },
  'com.neon.bank.android.prd': {
    name: 'Neon',
    packageNames: ['br.com.neon.app', 'com.neon.bank.android.prd'],
    parser: GenericBankParser,
    primaryColor: '#00CFBD',
  },
  'com.willbank': {
    name: 'Will Bank',
    packageNames: ['com.willbank', 'br.com.willbank'],
    parser: GenericBankParser,
    primaryColor: '#F9DD16',
  },
  'br.com.willbank': {
    name: 'Will Bank',
    packageNames: ['com.willbank', 'br.com.willbank'],
    parser: GenericBankParser,
    primaryColor: '#F9DD16',
  },
  'br.com.sicoob.mobile': {
    name: 'Sicoob',
    packageNames: ['br.com.sicoob.mobile', 'br.com.sicoob.sisbr'],
    parser: GenericBankParser,
    primaryColor: '#00A859',
  },
  'br.com.sicoob.sisbr': {
    name: 'Sicoob',
    packageNames: ['br.com.sicoob.mobile', 'br.com.sicoob.sisbr'],
    parser: GenericBankParser,
    primaryColor: '#00A859',
  },
  'br.com.sicredi.mobile': {
    name: 'Sicredi',
    packageNames: ['br.com.sicredi.mobile'],
    parser: GenericBankParser,
    primaryColor: '#339966',
  },
  'com.xpi.app': {
    name: 'XP',
    packageNames: ['com.xpi.app'],
    parser: GenericBankParser,
    primaryColor: '#000000',
  },
  'br.com.meliuz': {
    name: 'Méliuz',
    packageNames: ['br.com.meliuz'],
    parser: GenericBankParser,
    primaryColor: '#FF6A00',
  },
};

export function getBankConfig(packageName: string): BankConfig | null {
  return BANK_REGISTRY[packageName] ?? null;
}

export function isKnownBank(packageName: string): boolean {
  return packageName in BANK_REGISTRY;
}

export const KNOWN_PACKAGE_NAMES = new Set(Object.keys(BANK_REGISTRY));

export interface UniqueBank {
  name:         string;
  primaryColor: string;
  packageNames: string[];
}

/** Lista de bancos únicos (sem duplicar Inter, Itaú etc.) */
export function getUniqueBanks(): UniqueBank[] {
  const map = new Map<string, UniqueBank>();
  for (const config of Object.values(BANK_REGISTRY)) {
    if (!map.has(config.name)) {
      map.set(config.name, {
        name:         config.name,
        primaryColor: config.primaryColor,
        packageNames: config.packageNames,
      });
    }
  }
  return Array.from(map.values());
}

/** Normaliza nome de banco para comparação */
export function normalizeBankName(name: string): string {
  return name.toLowerCase().replace(/banco\s+/g, '').trim();
}
