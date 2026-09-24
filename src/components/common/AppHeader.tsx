import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from './BackButton';
import { colors, spacing, typography } from '../../theme';

export function AppHeader({
  title,
  eyebrow,
  back = false,
}: {
  title: string;
  eyebrow?: string;
  back?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {back ? <BackButton style={styles.back} /> : null}
      <View style={styles.copy}>
        <Text style={styles.brand}>{eyebrow || 'SMASHPOINT'}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    minHeight: 76,
  },
  back: { marginRight: spacing.sm },
  copy: { flex: 1 },
  brand: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: typography.pageTitle, fontWeight: '800', marginTop: 3 },
});
