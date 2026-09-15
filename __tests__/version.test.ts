import { compareSemver, isNewerVersion, parseVersionCodeFromBody, parseVersionTag } from '../src/utils/version';

describe('version utils', () => {
  it('parseVersionTag remove prefixo v', () => {
    expect(parseVersionTag('v2.0.1')).toBe('2.0.1');
    expect(parseVersionTag('2.0.1')).toBe('2.0.1');
  });

  it('compareSemver ordena corretamente', () => {
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareSemver('v1.2.3', '1.2.3')).toBe(0);
  });

  it('isNewerVersion', () => {
    expect(isNewerVersion('2.1.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('2.0.0', '2.0.0')).toBe(false);
    expect(isNewerVersion('1.9.0', '2.0.0')).toBe(false);
  });

  it('parseVersionCodeFromBody', () => {
    expect(parseVersionCodeFromBody('versionCode: 12\nNotas')).toBe(12);
    expect(parseVersionCodeFromBody('versionCode = 3')).toBe(3);
    expect(parseVersionCodeFromBody('sem codigo')).toBeNull();
  });
});
