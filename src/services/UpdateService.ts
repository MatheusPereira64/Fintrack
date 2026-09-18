/**
 * UpdateService — consulta releases do GitHub, baixa APK e instala
 * substituindo o app sem apagar dados (mesmo package + mesma assinatura).
 */
import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Logger } from './LoggerService';
import {
  isNewerVersion,
  parseVersionCodeFromBody,
  parseVersionTag,
} from '../utils/version';
import { useUpdateUiStore } from '../store/updateUiStore';

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

    const action = await useUpdateUiStore.getState().present({
      variant: 'permission',
      title: 'Permissão necessária',
      message: 'Para instalar atualizações, permita que o FinTrack instale apps de fontes desconhecidas.',
      primaryLabel: 'Abrir configurações',
      secondaryLabel: 'Agora não',
    });
    if (action === 'primary') {
      await UpdateModule.openUnknownSourcesSettings();
    }
    return false;
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
      const ui = useUpdateUiStore.getState();
      const action = await ui.present({
        variant: 'update',
        title: 'Nova versão disponível',
        message: 'A atualização substitui o app e mantém seus dados locais (mesmo pacote e assinatura).',
        primaryLabel: 'Atualizar agora',
        secondaryLabel: 'Depois',
        showGithub: true,
        githubUrl: remote.htmlUrl || RELEASES_PAGE,
        localVersion: local.versionName,
        remoteVersion: remote.versionName,
      });

      if (action !== 'primary') return;

      ui.present({
        variant: 'progress',
        title: 'Baixando atualização',
        message: 'Isso pode levar alguns segundos. Não feche o app.',
        dismissible: false,
      });
      try {
        await this.downloadAndInstall(remote, pct => ui.setProgress(pct));
        ui.close();
      } catch (err) {
        Logger.error('Update', 'Falha na atualização automática', err);
        await ui.present({
          variant: 'error',
          title: 'Não foi possível atualizar',
          message: `${String(err)}\n\nVocê também pode baixar o APK na página de releases.`,
          primaryLabel: 'OK',
          showGithub: true,
          githubUrl: RELEASES_PAGE,
        });
      }
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
      const ui = useUpdateUiStore.getState();

      if (result.status === 'unsupported') {
        await ui.present({
          variant: 'info',
          title: 'Atualizações',
          message: 'A atualização automática está disponível apenas no Android.',
          primaryLabel: 'OK',
        });
        return result;
      }
      if (result.status === 'error') {
        await ui.present({
          variant: 'error',
          title: 'Não foi possível verificar',
          message: result.message,
          primaryLabel: 'OK',
        });
        return result;
      }
      if (result.status === 'up_to_date') {
        if (!result.remote) {
          await ui.present({
            variant: 'info',
            title: 'Nenhuma release no GitHub',
            message: `Você está na versão ${result.local.versionName}, mas ainda não há uma release publicada.`,
            primaryLabel: 'OK',
            showGithub: true,
            githubUrl: RELEASES_PAGE,
            localVersion: result.local.versionName,
          });
          return result;
        }
        if (!result.remote.apkUrl) {
          await ui.present({
            variant: 'info',
            title: 'Release sem APK',
            message: `A release ${result.remote.name} existe, mas não tem um APK anexado. Abra a página para baixar manualmente.`,
            primaryLabel: 'OK',
            showGithub: true,
            githubUrl: result.remote.htmlUrl || RELEASES_PAGE,
          });
          return result;
        }
        await ui.present({
          variant: 'success',
          title: 'App atualizado',
          message: `Você já está na versão ${result.local.versionName}.`,
          primaryLabel: 'OK',
          localVersion: result.local.versionName,
        });
        return result;
      }

      const { remote, local } = result;
      if (!remote.apkUrl) {
        await ui.present({
          variant: 'info',
          title: 'Atualização encontrada',
          message: `A versão ${remote.versionName} está no GitHub, mas a release não tem APK anexado.`,
          primaryLabel: 'OK',
          showGithub: true,
          githubUrl: remote.htmlUrl || RELEASES_PAGE,
          localVersion: local.versionName,
          remoteVersion: remote.versionName,
        });
        return result;
      }

      const action = await ui.present({
        variant: 'update',
        title: 'Atualização encontrada',
        message: 'Deseja baixar e instalar? Seus dados locais serão mantidos.',
        primaryLabel: 'Atualizar',
        secondaryLabel: 'Cancelar',
        showGithub: true,
        githubUrl: remote.htmlUrl || RELEASES_PAGE,
        localVersion: local.versionName,
        remoteVersion: remote.versionName,
      });

      if (action !== 'primary') return result;

      ui.present({
        variant: 'progress',
        title: 'Baixando atualização',
        message: 'Isso pode levar alguns segundos. Não feche o app.',
        dismissible: false,
      });
      try {
        await this.downloadAndInstall(remote, pct => {
          onProgress?.(pct);
          ui.setProgress(pct);
        });
        ui.close();
        return result;
      } catch (err) {
        await ui.present({
          variant: 'error',
          title: 'Erro na atualização',
          message: String(err),
          primaryLabel: 'OK',
          showGithub: true,
          githubUrl: RELEASES_PAGE,
        });
        return { status: 'error', message: String(err) };
      }
    } finally {
      checking = false;
      onProgress?.(null);
    }
  },
};
