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
  iconUri?:     string;
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

function toIconUri(base64?: string): string | undefined {
  if (!base64) return undefined;
  return `data:image/png;base64,${base64}`;
}

/**
 * Lista bancos instalados sem baixar ícones (rápido).
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

/** Carrega ícones um a um, sem bloquear a listagem. */
export async function hydrateBankIcons(banks: DetectedBank[]): Promise<DetectedBank[]> {
  if (Platform.OS !== 'android' || !NotificationModule?.getBankAppIcon) {
    return banks;
  }
  const next = [...banks];
  await Promise.all(next.map(async (bank, i) => {
    try {
      const b64: string | null = await NotificationModule.getBankAppIcon(bank.packageName);
      if (b64) next[i] = { ...bank, iconUri: toIconUri(b64) };
    } catch {
      // fallback de cor
    }
  }));
  return next;
}

export function getNewBanks(detected: DetectedBank[]): DetectedBank[] {
  return detected.filter(b => !b.alreadyRegistered);
}
