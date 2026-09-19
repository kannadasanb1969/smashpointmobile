import { SafeAreaView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, spacing } from '../../theme';
export function ScreenContainer({ children, dark = false }: PropsWithChildren<{ dark?: boolean }>) {
  return (
    <SafeAreaView style={[styles.root, dark && styles.dark]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  dark: { backgroundColor: '#021B17' },
  keyboard: { flex: 1 },
});
