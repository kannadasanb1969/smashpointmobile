import { Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../src/theme';
export default function Splash() {
  return (
    <>
      <Redirect href="/(auth)/login" />
      <View style={s.root}>
        <Text style={s.mark}>🏸</Text>
        <Text style={s.brand}>SmashPoint</Text>
        <Text style={s.tag}>Play. Compete. Belong.</Text>
        <Text style={s.sub}>Badminton for Everyone</Text>
      </View>
    </>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 60, marginBottom: spacing.md },
  brand: { fontSize: 36, fontWeight: '800', color: colors.white },
  tag: { fontSize: 16, color: '#CBE8D9', marginTop: spacing.sm },
  sub: { fontSize: 14, color: '#86B89D', marginTop: spacing.xs },
});
