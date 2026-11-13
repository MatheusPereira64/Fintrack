/**
 * Acesso ao módulo nativo DeviceModule (Android): compartilhar arquivo e
 * bloqueio por biometria. Em plataformas sem o módulo, os recursos ficam
 * indisponíveis em vez de quebrar.
 */
import { NativeModules } from 'react-native';

interface DeviceModuleShape {
  shareFile(path: string, mimeType: string, title: string): Promise<boolean>;
  canAuthenticate(): Promise<boolean>;
  authenticate(title: string, subtitle: string, cancelLabel: string): Promise<boolean>;
}

/** Lido na hora do uso, não no carregamento do arquivo. */
const getNative = (): DeviceModuleShape | undefined => NativeModules.DeviceModule;

export const DeviceService = {
  isAvailable(): boolean {
    return !!getNative();
  },

  async shareFile(path: string, mimeType: string, title: string): Promise<void> {
    const native = getNative();
    if (!native) throw new Error('Compartilhamento de arquivo indisponível neste aparelho');
    await native.shareFile(path, mimeType, title);
  },

  async canAuthenticate(): Promise<boolean> {
    const native = getNative();
    if (!native) return false;
    try {
      return await native.canAuthenticate();
    } catch {
      return false;
    }
  },

  /** true quando o usuário se autenticou; false se cancelou ou falhou. */
  async authenticate(title: string, subtitle: string, cancelLabel: string): Promise<boolean> {
    const native = getNative();
    if (!native) return false;
    try {
      return await native.authenticate(title, subtitle, cancelLabel);
    } catch {
      return false;
    }
  },
};
