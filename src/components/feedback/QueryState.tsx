import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../common/PrimaryButton';
import { colors, spacing } from '../../theme';
import { EmptyState } from './EmptyState';
export function QueryState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  empty?: boolean;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <View style={s.loading}>
        <ActivityIndicator accessibilityLabel="Loading" size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading your court data…</Text>
      </View>
    );
  if (error)
    return (
      <View style={s.error}>
        <Text style={s.errorIcon}>!</Text>
        <Text style={s.errorTitle}>We couldn’t load that.</Text>
        <Text style={s.errorText}>Check your connection and try again.</Text>
        <PrimaryButton title="Try again" onPress={onRetry} />
      </View>
    );
  if (empty) return <EmptyState />;
  return null;
}
const s = StyleSheet.create({
  loading: { alignItems: 'center', padding: spacing.section },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  error: {
    backgroundColor: '#FFF7F7',
    borderColor: '#F0D7D7',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  errorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FBE2E2',
    color: colors.error,
    textAlign: 'center',
    paddingTop: 4,
    fontWeight: '900',
  },
  errorTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: spacing.sm },
  errorText: { color: colors.muted, fontSize: 13, marginVertical: spacing.sm },
});
