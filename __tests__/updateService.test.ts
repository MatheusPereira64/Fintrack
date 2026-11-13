/**
 * O atualizador lê o latest.json do release (sem limite de consultas) e só usa
 * a API do GitHub como plano B; limite da API vira uma mensagem clara.
 */
jest.mock('react-native', () => ({ NativeModules: {}, Platform: { OS: 'android' } }));
jest.mock('react-native-fs', () => ({ __esModule: true, default: {} }));
jest.mock('../src/services/LoggerService', () => ({ Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../src/store/updateUiStore', () => ({ useUpdateUiStore: { getState: () => ({}) } }));
jest.mock('../src/i18n/config', () => ({ __esModule: true, default: { t: (k: string) => k, language: 'pt-BR' } }));

import {
  UpdateService, UpdateRateLimitError, LATEST_MANIFEST_URL,
} from '../src/services/UpdateService';

const response = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const MANIFEST = {
  tag: 'v1.0.9', version: '1.0.9', versionCode: 13,
  apkName: 'FinTrack-1.0.9.apk',
  apkUrl: 'https://github.com/MatheusPereira64/Fintrack/releases/download/v1.0.9/FinTrack-1.0.9.apk',
  htmlUrl: 'https://github.com/MatheusPereira64/Fintrack/releases/tag/v1.0.9',
  publishedAt: '2026-11-13T00:00:00Z', notes: 'Notas',
};

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (globalThis as any).fetch = fetchMock;
});

test('usa o latest.json e não chama a API do GitHub', async () => {
  fetchMock.mockResolvedValueOnce(response(200, MANIFEST));

  const remote = await UpdateService.fetchLatestRelease();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe(LATEST_MANIFEST_URL);
  expect(remote).toMatchObject({ versionName: '1.0.9', versionCode: 13, apkUrl: MANIFEST.apkUrl });
});

test('sem latest.json (release antigo), cai na API', async () => {
  fetchMock
    .mockResolvedValueOnce(response(404))
    .mockResolvedValueOnce(response(200, {
      tag_name: 'v1.0.8', name: 'FinTrack 1.0.8', body: 'versionCode: 12', html_url: 'x',
      published_at: '', assets: [{ name: 'FinTrack-1.0.8.apk', browser_download_url: 'apk' }],
    }));

  const remote = await UpdateService.fetchLatestRelease();

  expect(fetchMock.mock.calls[1][0]).toMatch(/api\.github\.com.*\/releases\/latest$/);
  expect(remote).toMatchObject({ versionName: '1.0.8', versionCode: 12, apkUrl: 'apk' });
});

test('limite da API (403) vira erro próprio e mensagem traduzida', async () => {
  fetchMock.mockResolvedValueOnce(response(404)).mockResolvedValueOnce(response(403));
  await expect(UpdateService.fetchLatestRelease()).rejects.toBeInstanceOf(UpdateRateLimitError);

  fetchMock.mockResolvedValueOnce(response(404)).mockResolvedValueOnce(response(403));
  const result = await UpdateService.checkForUpdate();
  expect(result).toEqual({ status: 'error', message: 'updateService.rateLimited' });
});

test('latest.json com versão nova indica atualização disponível', async () => {
  fetchMock.mockResolvedValueOnce(response(200, MANIFEST));
  jest.spyOn(UpdateService, 'getLocalVersion').mockResolvedValue({
    versionName: '1.0.8', versionCode: 12, applicationId: 'com.fintrackapp',
  });

  const result = await UpdateService.checkForUpdate();

  expect(result.status).toBe('update_available');
});
