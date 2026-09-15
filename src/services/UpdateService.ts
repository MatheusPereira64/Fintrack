/**
 * UpdateService — consulta releases do GitHub, baixa APK e instala
 * substituindo o app sem apagar dados (mesmo package + mesma assinatura).
 */
import { Alert, Linking, NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Logger } from './LoggerService';
import {
  isNewerVersion,
  parseVersionCodeFromBody,
  parseVersionTag,
} from '../utils/version';

const { UpdateModule } = NativeModules;

/** Repo público das releases do FinTrack */
export const GITHUB_OWNER = 'MatheusPereira64';
export const GITHUB_REPO  = 'Fintrack';
const GH_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const RELEASES_API = `${GH_API}/releases/latest`;
export const RELEASES_PAGE =
  `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'FinTrackApp',
} as const;

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  applicationId: string;
}

export interface RemoteRelease {
  tagName: string;
  versionName: string;
  versionCode: number | null;
  name: string;
  body: string;
  htmlUrl: string;
  apkUrl: string | null;
  apkName: string | null;
  publishedAt: string;
}

export type UpdateCheckResult =
  | { status: 'up_to_date'; local: AppVersionInfo; remote?: RemoteRelease }
  | { status: 'update_available'; local: AppVersionInfo; remote: RemoteRelease }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

let checking = false;
let lastAutoCheckAt = 0;
const AUTO_CHECK_COOLDOWN_MS = 5 * 60 * 1000;

interface GhAsset {
  name: string;
  browser_download_url: string;
  content_type?: string;
  size?: number;
}

interface GhRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: GhAsset[];
}

function pickApkAsset(assets: GhAsset[]): GhAsset | null {
  const apks = assets.filter(a =>
    a.name.toLowerCase().endsWith('.apk')
    || (a.content_type ?? '').includes('android.package'),
  );
  if (apks.length === 0) return null;
  const preferred = apks.find(a => /release|fintrack|universal/i.test(a.name));
  return preferred ?? apks[0];
}

function mapRelease(data: GhRelease): RemoteRelease {
  const apk = pickApkAsset(data.assets ?? []);
  return {
    tagName: data.tag_name,
    versionName: parseVersionTag(data.tag_name),
    versionCode: parseVersionCodeFromBody(data.body),
    name: data.name || data.tag_name,
    body: data.body || '',
    htmlUrl: data.html_url,
    apkUrl: apk?.browser_download_url ?? null,
    apkName: apk?.name ?? null,
    publishedAt: data.published_at,
  };
}

async function ghJson<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const res = await fetch(`${GH_API}${path}`, { headers: GH_HEADERS });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: (await res.json()) as T };
}

export const UpdateService = {

  async getLocalVersion(): Promise<AppVersionInfo> {
    if (!UpdateModule?.getVersionInfo) {
      return { versionName: '0.0.0', versionCode: 0, applicationId: 'com.fintrackapp' };
    }
    return UpdateModule.getVersionInfo();
  },

  async fetchLatestRelease(): Promise<RemoteRelease | null> {
    const latest = await ghJson<GhRelease>('/releases/latest');
    if (latest.ok) return mapRelease(latest.data);

    if (latest.status !== 404) {
      throw new Error(`GitHub API ${latest.status}`);
    }

    // /latest devolve 404 quando só existe tag, ou só draft/pre-release.
    const listed = await ghJson<GhRelease[]>('/releases?per_page=10');
    if (!listed.ok) {
      if (listed.status === 404) return null;
      throw new Error(`GitHub API ${listed.status}`);
    }

    const published = listed.data.find(r => pickApkAsset(r.assets ?? []));
    return published ? mapRelease(published) : (listed.data[0] ? mapRelease(listed.data[0]) : null);
  },

  async checkForUpdate(): Promise<UpdateCheckResult> {
    if (Platform.OS !== 'android') {
      return { status: 'unsupported' };
    }

    try {
      const local = await this.getLocalVersion();
      const remote = await this.fetchLatestRelease();

      if (!remote) {
        return { status: 'up_to_date', local };
      }

      const byCode =
        remote.versionCode != null && remote.versionCode > local.versionCode;
      const byName = isNewerVersion(remote.versionName, local.versionName);

      if ((byCode || byName) && remote.apkUrl) {
        return { status: 'update_available', local, remote };
      }

      return { status: 'up_to_date', local, remote };
    } catch (err) {
      Logger.warn('Update', 'Falha ao verificar atualização', err);
      return { status: 'error', message: String(err) };
    }
  },

  async downloadApk(
    url: string,
    fileName: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'FinTrack-update.apk';
    const dest = `${RNFS.CachesDirectoryPath}/${safeName}`;

    if (await RNFS.exists(dest)) {
      await RNFS.unlink(dest);
    }

    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile: dest,
      progressDivider: 5,
      begin: () => onProgress?.(0),
      progress: (p) => {
        if (p.contentLength > 0) {
          onProgress?.(Math.round((p.bytesWritten / p.contentLength) * 100));
        }
      },
    }).promise;

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`Download falhou (HTTP ${result.statusCode})`);
    }

    return dest;
  },

  async ensureInstallPermission(): Promise<boolean> {
    if (!UpdateModule?.canRequestPackageInstalls) return false;
    const allowed = await UpdateModule.canRequestPackageInstalls();
    if (allowed) return true;

    return new Promise(resolve => {
      Alert.alert(
        'Permissão necessária',
        'Para instalar atualizações, permita que o FinTrack instale apps desconhecidos.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Abrir configurações',
            onPress: async () => {
              await UpdateModule.openUnknownSourcesSettings();
              resolve(false);
            },
          },
        ],
      );
    });
  },

  async installApk(path: string): Promise<void> {
    let allowed = await UpdateModule?.canRequestPackageInstalls?.();
    if (!allowed) {
      allowed = await this.ensureInstallPermission();
    }
    if (!allowed) {
      throw new Error('Permissão de instalação negada. Ative em Configurações e tente de novo.');
    }
    await UpdateModule.installApk(path);
  },

  /**
   * Baixa e abre o instalador. Dados do usuário são preservados
   * quando o APK usa o mesmo applicationId e assinatura.
   */
  async downloadAndInstall(remote: RemoteRelease, onProgress?: (pct: number) => void): Promise<void> {
    if (!remote.apkUrl) {
      throw new Error('Release sem APK anexado');
    }
    Logger.info('Update', 'Baixando atualização', { tag: remote.tagName });
    const path = await this.downloadApk(
      remote.apkUrl,
      remote.apkName ?? `FinTrack-${remote.versionName}.apk`,
      onProgress,
    );
    await this.installApk(path);
  },

  /** Checagem automática ao abrir o app (com cooldown). */
  async checkOnLaunch(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (checking) return;
    const now = Date.now();
    if (now - lastAutoCheckAt < AUTO_CHECK_COOLDOWN_MS) return;

    checking = true;
    lastAutoCheckAt = now;
    try {
      const result = await this.checkForUpdate();
      if (result.status !== 'update_available') return;

      const { remote, local } = result;
      Alert.alert(
        'Nova versão disponível',
        `FinTrack ${remote.versionName} está disponível (você tem ${local.versionName}).\n\nA atualização substitui o app e mantém seus dados locais.`,
        [
          { text: 'Depois', style: 'cancel' },
          {
            text: 'Ver no GitHub',
            onPress: () => Linking.openURL(remote.htmlUrl || RELEASES_PAGE),
          },
          {
            text: 'Atualizar agora',
            onPress: () => {
              Alert.alert('Baixando atualização', 'Isso pode levar alguns segundos…');
              this.downloadAndInstall(remote)
                .catch(err => {
                  Logger.error('Update', 'Falha na atualização automática', err);
                  Alert.alert(
                    'Não foi possível atualizar',
                    `${String(err)}\n\nVocê também pode baixar em:\n${RELEASES_PAGE}`,
                    [
                      { text: 'OK', style: 'cancel' },
                      { text: 'Abrir GitHub', onPress: () => Linking.openURL(RELEASES_PAGE) },
                    ],
                  );
                });
            },
          },
        ],
      );
    } finally {
      checking = false;
    }
  },

  /** Fluxo do botão em Configurações. */
  async checkFromSettings(
    onProgress?: (pct: number | null) => void,
  ): Promise<UpdateCheckResult> {
    if (checking) {
      return { status: 'error', message: 'Já existe uma verificação em andamento.' };
    }
    checking = true;
    try {
      onProgress?.(null);
      const result = await this.checkForUpdate();

      if (result.status === 'unsupported') {
        Alert.alert('Atualizações', 'Atualização automática disponível apenas no Android.');
        return result;
      }
      if (result.status === 'error') {
        Alert.alert('Erro', `Não foi possível verificar: ${result.message}`);
        return result;
      }
      if (result.status === 'up_to_date') {
        if (!result.remote) {
          Alert.alert(
            'Nenhuma release no GitHub',
            `Você está na versão ${result.local.versionName}, mas ainda não há uma release publicada em ${RELEASES_PAGE}.`,
            [
              { text: 'OK', style: 'cancel' },
              { text: 'Abrir GitHub', onPress: () => Linking.openURL(RELEASES_PAGE) },
            ],
          );
          return result;
        }
        if (!result.remote.apkUrl) {
          Alert.alert(
            'Release sem APK',
            `A release ${result.remote.name} existe, mas não tem um APK anexado. Abra a página para baixar manualmente.`,
            [
              { text: 'OK', style: 'cancel' },
              { text: 'Abrir GitHub', onPress: () => Linking.openURL(result.remote!.htmlUrl || RELEASES_PAGE) },
            ],
          );
          return result;
        }
        Alert.alert(
          'App atualizado',
          `Você já está na versão ${result.local.versionName}.`,
        );
        return result;
      }

      const { remote, local } = result;
      if (!remote.apkUrl) {
        Alert.alert(
          'Atualização encontrada',
          `Versão ${remote.versionName} está no GitHub, mas a release não tem APK anexado.`,
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Abrir GitHub', onPress: () => Linking.openURL(remote.htmlUrl || RELEASES_PAGE) },
          ],
        );
        return result;
      }
      return await new Promise(resolve => {
        Alert.alert(
          'Atualização encontrada',
          `Versão ${remote.versionName} disponível (atual: ${local.versionName}).\n\nDeseja baixar e instalar? Seus dados serão mantidos.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(result) },
            {
              text: 'Atualizar',
              onPress: async () => {
                try {
                  await this.downloadAndInstall(remote, pct => onProgress?.(pct));
                  resolve(result);
                } catch (err) {
                  Alert.alert('Erro na atualização', String(err));
                  resolve({ status: 'error', message: String(err) });
                } finally {
                  onProgress?.(null);
                }
              },
            },
          ],
        );
      });
    } finally {
      checking = false;
      onProgress?.(null);
    }
  },
};
