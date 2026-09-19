import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
export function EmptyState({
  title = 'Nothing here yet.',
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <View style={s.wrap}>
      <Text style={s.icon}>⌁</Text>
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: 'center', padding: spacing.section },
  icon: { color: colors.primary, fontSize: 32, fontWeight: '900' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
  message: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 5 },
});
