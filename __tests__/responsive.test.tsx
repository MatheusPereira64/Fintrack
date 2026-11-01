/**
 * @format
 */

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));

jest.mock('../src/hooks/useTheme', () => {
  const { lightTheme } = jest.requireActual('../src/theme');
  return { useTheme: () => lightTheme };
});

jest.mock('../src/components/Icon', () => ({ Icon: () => null }));

jest.mock('../src/i18n/config', () => ({
  __esModule: true,
  default: { language: 'pt-BR' },
}));

import React from 'react';
import { Modal, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { BottomSheet } from '../src/components/BottomSheet';
import { getResponsiveLayout, SIDE_NAV_MIN_WIDTH } from '../src/hooks/useResponsive';
import { parseLocalISODate, toLocalISODate } from '../src/utils/date';

const ptBR = require('../src/i18n/locales/pt-BR.json');
const en = require('../src/i18n/locales/en.json');
const es = require('../src/i18n/locales/es.json');

describe('getResponsiveLayout', () => {
  test('celular em pé mantém tab bar inferior', () => {
    expect(getResponsiveLayout(393, 852)).toMatchObject({ useSideNav: false, isShortHeight: false });
  });

  test('celular deitado usa barra lateral e layout baixo', () => {
    expect(getResponsiveLayout(852, 393)).toMatchObject({ useSideNav: true, isShortHeight: true });
  });

  test('tablet usa barra lateral a partir do breakpoint', () => {
    expect(getResponsiveLayout(SIDE_NAV_MIN_WIDTH - 1, 1000).useSideNav).toBe(false);
    expect(getResponsiveLayout(SIDE_NAV_MIN_WIDTH, 1000).useSideNav).toBe(true);
  });
});

describe('BottomSheet', () => {
  function render(onClose: () => void, visible = true) {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <BottomSheet visible={visible} title="Título" onClose={onClose}>
          <Text>conteúdo</Text>
        </BottomSheet>,
      );
    });
    return tree;
  }

  test('botão voltar do Android fecha o sheet', () => {
    const onClose = jest.fn();
    render(onClose).root.findByType(Modal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('tocar fora do sheet fecha', () => {
    const onClose = jest.fn();
    const backdrop = render(onClose).root.findAll(
      n => n.props.accessibilityLabel === 'common.close' && typeof n.props.onPress === 'function',
    )[0];
    backdrop.props.onPress();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('não renderiza o conteúdo quando fechado', () => {
    const tree = render(jest.fn(), false);
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
  });
});

describe('datas locais', () => {
  test('não adianta o dia à noite em fuso negativo', () => {
    expect(toLocalISODate(new Date(2026, 10, 1, 23, 30))).toBe('2026-11-01');
  });

  test('ida e volta preserva o dia', () => {
    expect(toLocalISODate(parseLocalISODate('2026-02-28'))).toBe('2026-02-28');
  });
});

describe('traduções novas', () => {
  const pick = (locale: any) => [
    ...Object.keys(locale.a11y),
    locale.addTransaction.date,
    locale.moreMenu.sectionPlanning,
    locale.dashboard.addFirstTransaction,
  ];

  test('existem nos três idiomas', () => {
    for (const locale of [ptBR, en, es]) {
      expect(pick(locale).every(Boolean)).toBe(true);
      expect(Object.keys(locale.a11y).sort()).toEqual(Object.keys(ptBR.a11y).sort());
    }
  });
});
