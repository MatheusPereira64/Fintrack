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
  alreadyRegistered: boolean;
}

interface NativeBankApp {
  packageName: string;
  label:       string;
}

function isAccountForBank(account: Account, bankName: string): boolean {
  if (!account.bankName) return false;
  return normalizeBankName(account.bankName) === normalizeBankName(bankName)
    || account.bankName.toLowerCase().includes(bankName.toLowerCase())
    || bankName.toLowerCase().includes(account.bankName.toLowerCase());
}

/** Detecta bancos instalados no dispositivo que o FinTrack reconhece. */
export async function detectInstalledBanks(
  existingAccounts: Account[] = [],
): Promise<DetectedBank[]> {
  if (Platform.OS !== 'android' || !NotificationModule?.getInstalledBankApps) {
    return [];
  }

  const installed: NativeBankApp[] = await NotificationModule.getInstalledBankApps();
  const uniqueBanks = getUniqueBanks();
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
