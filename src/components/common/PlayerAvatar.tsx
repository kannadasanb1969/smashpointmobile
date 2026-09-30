import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

// Purely decorative per-player avatar colors, cycled by name — no identity/business meaning.
// Mirrors the same pattern already used in app/(player)/friendly/[id].tsx (kept local there;
// this shared copy is for the new/touched screens in Phase 4 rather than a retroactive refactor).
const PALETTE = ['#2FA39A', '#C48A2F', '#7A5FD1', '#3B7FC4', '#2F8F52', '#B6469B'];

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase() || 'P';

const colorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

export function PlayerAvatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        s.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name) },
      ]}
    >
      <Text style={[s.initials, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.white, fontWeight: '900' },
});
