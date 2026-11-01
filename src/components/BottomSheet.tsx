import React from 'react';
import {
  KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { SHEET_MAX_WIDTH, useResponsive } from '../hooks/useResponsive';
import { CloseButton } from './CloseButton';

const SHEET_MAX_HEIGHT_RATIO = 0.92;

interface BottomSheetProps {
  visible:   boolean;
  title:     string;
  onClose:   () => void;
  children:  React.ReactNode;
  /** Ações fixas abaixo do conteúdo rolável. */
  footer?:   React.ReactNode;
}

/**
 * Bottom sheet padrão: fecha pelo botão voltar do Android e ao tocar fora,
 * sobe com o teclado, rola quando o conteúdo não cabe e não estica em tablets.
 */
export function BottomSheet({
  visible, title, onClose, children, footer,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { height } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {visible ? (
        <KeyboardAvoidingView
          behavior="padding"
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
          <View
            accessibilityViewIsModal
            style={[styles.sheet, {
              backgroundColor:      colors.card,
              borderTopLeftRadius:  borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              paddingTop:           spacing.xl,
              paddingHorizontal:    spacing.xl,
              paddingBottom:        Math.max(insets.bottom, spacing.base),
              maxHeight:            height * SHEET_MAX_HEIGHT_RATIO,
            }]}
          >
            <View style={[styles.header, { marginBottom: spacing.md }]}>
              <Text
                accessibilityRole="header"
                style={[typography.styles.titleLarge, styles.title, { color: colors.text, marginRight: spacing.sm }]}
              >
                {title}
              </Text>
              <CloseButton onPress={onClose} />
            </View>

            <ScrollView
              style={styles.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.md }}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View style={[styles.footer, { gap: spacing.sm, paddingTop: spacing.md, borderTopColor: colors.borderLight }]}>
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet:   { width: '100%', maxWidth: SHEET_MAX_WIDTH, alignSelf: 'center' },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:   { flex: 1 },
  body:    { flexGrow: 0, flexShrink: 1 },
  footer:  { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
});
