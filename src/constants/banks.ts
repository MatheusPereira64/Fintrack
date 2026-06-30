export interface BankInfo {
  id: string;
  name: string;
  packageNames: string[];
  primaryColor: string;
  logoEmoji: string;
}

export const BANKS: BankInfo[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    packageNames: ['com.nubank.nubank'],
    primaryColor: '#820AD1',
    logoEmoji: '💜',
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    packageNames: ['br.com.intermedium', 'com.bancointer.banking'],
    primaryColor: '#FF6B00',
    logoEmoji: '🟠',
  },
  {
    id: 'itau',
    name: 'Itaú',
    packageNames: ['com.itau', 'com.itau.empresas'],
    primaryColor: '#EC7000',
    logoEmoji: '🔵',
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    packageNames: ['com.bradesco', 'com.bradesco.prime'],
    primaryColor: '#CC0000',
    logoEmoji: '❤️',
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    packageNames: ['com.bb.android'],
    primaryColor: '#FFD700',
    logoEmoji: '💛',
  },
  {
    id: 'santander',
    name: 'Santander',
    packageNames: ['com.santander.app', 'com.santander.way'],
    primaryColor: '#EC0000',
    logoEmoji: '🔴',
  },
  {
    id: 'c6bank',
    name: 'C6 Bank',
    packageNames: ['br.com.c6bank.app'],
    primaryColor: '#1C1C1C',
    logoEmoji: '⚫',
  },
  {
    id: 'caixa',
    name: 'Caixa Econômica',
    packageNames: ['br.gov.caixa.internet.smartphones'],
    primaryColor: '#006FB4',
    logoEmoji: '🔷',
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    packageNames: ['com.mercadopago.wallet'],
    primaryColor: '#009EE3',
    logoEmoji: '💙',
  },
  {
    id: 'picpay',
    name: 'PicPay',
    packageNames: ['com.picpay'],
    primaryColor: '#21C25E',
    logoEmoji: '💚',
  },
  {
    id: 'next',
    name: 'Next',
    packageNames: ['br.com.bradesco.next'],
    primaryColor: '#00E5B4',
    logoEmoji: '🟢',
  },
  {
    id: 'original',
    name: 'Banco Original',
    packageNames: ['br.com.original.bank'],
    primaryColor: '#00A13A',
    logoEmoji: '🟩',
  },
  {
    id: 'pagbank',
    name: 'PagBank',
    packageNames: ['br.com.uol.ps.myaccount'],
    primaryColor: '#03C759',
    logoEmoji: '💳',
  },
  {
    id: 'neon',
    name: 'Neon',
    packageNames: ['br.com.neon.app'],
    primaryColor: '#00CFBD',
    logoEmoji: '🩵',
  },
  {
    id: 'will',
    name: 'Will Bank',
    packageNames: ['com.willbank'],
    primaryColor: '#F9DD16',
    logoEmoji: '💛',
  },
];

export function getBankByPackage(packageName: string): BankInfo | undefined {
  return BANKS.find(b => b.packageNames.includes(packageName));
}

export function getBankById(id: string): BankInfo | undefined {
  return BANKS.find(b => b.id === id);
}

// Package names de todos os bancos (para filtro no listener)
export const KNOWN_BANK_PACKAGES = new Set(
  BANKS.flatMap(b => b.packageNames),
);
