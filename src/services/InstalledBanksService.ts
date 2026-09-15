import { Platform, NativeModules } from 'react-native';
import { Account } from '../models/types';
import {
  BANK_REGISTRY,
  normalizeBankName,
} from '../modules/notifications/services/BankRegistry';

const { NotificationModule } = NativeModules;

export interface DetectedBank {
  name:         string;
  primaryColor: string;
  packageName:  string;
  appLabel:     string;
  /** data URI do ícone do app instalado (PNG Base64), quando disponível */
  iconUri?:     string;
  alreadyRegistered: boolean;
}

interface NativeBankApp {
  packageName: string;
  label:       string;
  iconBase64?: string;
}

function isAccountForBank(account: Account, bankName: string): boolean {
  if (!account.bankName) return false;
  return normalizeBankName(account.bankName) === normalizeBankName(bankName)
    || account.bankName.toLowerCase().includes(bankName.toLowerCase())
    || bankName.toLowerCase().includes(account.bankName.toLowerCase());
}

function toIconUri(base64?: string): string | undefined {
  if (!base64) return undefined;
  return `data:image/png;base64,${base64}`;
}

/**
 * Detecta bancos instalados no dispositivo que o FinTrack reconhece.
 * Inclui o ícone real do app via PackageManager (Android).
 * Não há API pública de saldo nos apps — o usuário informa o valor manualmente.
 */
export async function detectInstalledBanks(
  existingAccounts: Account[] = [],
): Promise<DetectedBank[]> {
  if (Platform.OS !== 'android' || !NotificationModule?.getInstalledBankApps) {
    return [];
  }

  const installed: NativeBankApp[] = await NotificationModule.getInstalledBankApps();
  const detected = new Map<string, DetectedBank>();

  for (const app of installed) {
    const config = BANK_REGISTRY[app.packageName];
    if (!config) continue;
    if (detected.has(config.name)) continue;

    detected.set(config.name, {
      name:              config.name,
      primaryColor:      config.primaryColor,
      packageName:       app.packageName,
      appLabel:          app.label,
      iconUri:           toIconUri(app.iconBase64),
      alreadyRegistered: existingAccounts.some(a => isAccountForBank(a, config.name)),
    });
  }

  return Array.from(detected.values()).sort((a, b) => {
    if (a.alreadyRegistered !== b.alreadyRegistered) {
      return a.alreadyRegistered ? 1 : -1;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/** Bancos instalados ainda não cadastrados como conta */
export function getNewBanks(detected: DetectedBank[]): DetectedBank[] {
  return detected.filter(b => !b.alreadyRegistered);
}
