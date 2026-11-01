import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { CONTENT_MAX_WIDTH } from '../hooks/useResponsive';

/** Centraliza a tela em uma coluna legível em tablets e no modo paisagem. */
export function ContentColumn({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
});
