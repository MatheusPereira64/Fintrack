/**
 * Comparação de versões semver e versionCode para updates via GitHub.
 */

export function parseVersionTag(tag: string): string {
  return tag.trim().replace(/^v/i, '');
}

/** Retorna >0 se a > b, <0 se a < b, 0 se iguais. */
export function compareSemver(a: string, b: string): number {
  const pa = parseVersionTag(a).split(/[.+-]/).map(p => parseInt(p, 10) || 0);
  const pb = parseVersionTag(b).split(/[.+-]/).map(p => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export function isNewerVersion(remote: string, local: string): boolean {
  return compareSemver(remote, local) > 0;
}

/** Extrai versionCode de body da release, ex: "versionCode: 12" */
export function parseVersionCodeFromBody(body?: string | null): number | null {
  if (!body) return null;
  const m = body.match(/versionCode\s*[:=]\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

export type UpdateKind = 'marketing' | 'patch';

/**
 * Classifica uma atualização já detectada para UX.
 * Prioridade: versionName mais novo → marketing; senão versionCode maior → patch.
 */
export function classifyUpdateKind(
  local: { versionName: string; versionCode: number },
  remote: { versionName: string; versionCode: number | null },
): UpdateKind | null {
  if (isNewerVersion(remote.versionName, local.versionName)) return 'marketing';
  if (remote.versionCode != null && remote.versionCode > local.versionCode) return 'patch';
  return null;
}
