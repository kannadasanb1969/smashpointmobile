import { StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../theme';

export function StatusBadge({
  label,
  tone = 'success',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'neutral' | 'error' | 'info' | 'closed' | 'completed';
}) {
  return <Text style={[styles.base, styles[tone]]}>{label}</Text>;
}
const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  success: { backgroundColor: '#123F31', color: '#A8F06A', borderWidth: 1, borderColor: '#287754' },
  warning: { backgroundColor: '#FFF0D2', color: colors.warning },
  closed: { backgroundColor: '#4A3815', color: '#FFD54A', borderWidth: 1, borderColor: '#8B6D22' },
  completed: {
    backgroundColor: '#20394B',
    color: '#A7D5F2',
    borderWidth: 1,
    borderColor: '#41677F',
  },
  neutral: { backgroundColor: '#203039', color: '#A8B6B1' },
  error: { backgroundColor: '#4B2428', color: '#FF9B9B' },
  info: { backgroundColor: '#20394B', color: '#A7D5F2' },
});
