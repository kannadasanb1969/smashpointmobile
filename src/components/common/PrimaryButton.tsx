import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '../../theme';
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    ...shadows.button,
  },
  disabled: { backgroundColor: colors.disabled, shadowOpacity: 0 },
  text: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
