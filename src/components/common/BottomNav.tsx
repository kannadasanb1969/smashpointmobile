import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../theme';

// The player workspace has 5 top-level tab destinations (Home, Tournaments, Friendly, Players,
// Profile), but this bar previously only existed as inline-duplicated JSX on 2 of them (Home and
// Tournaments) — tapping into Friendly, Players or Profile left the user with no way to jump to a
// sibling tab short of backing out via the header link or the device back button. This shared
// component restores the bar consistently across all 5 tab destinations.
const TABS: { icon: string; label: string; path: string }[] = [
  { icon: '⌂', label: 'Home', path: '/(player)/' },
  { icon: '♛', label: 'Tournaments', path: '/(player)/tournaments' },
  { icon: '⚡', label: 'Friendly', path: '/(player)/friendly' },
  { icon: '♙', label: 'Players', path: '/(player)/players' },
  { icon: '◎', label: 'Profile', path: '/(player)/profile' },
];

export function BottomNav({ active }: { active: 'Home' | 'Tournaments' | 'Friendly' | 'Players' | 'Profile' }) {
  return (
    <View style={s.nav}>
      {TABS.map(({ icon, label, path }) => (
        <Pressable
          key={label}
          onPress={() => {
            if (label !== active) router.push(path as never);
          }}
          style={[s.navItem, label === active && s.navActive]}
        >
          <Text style={[s.navIcon, label === active && s.lime]}>{icon}</Text>
          <Text style={[s.navText, label === active && s.lime]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#031F1A',
    borderTopWidth: 1,
    borderTopColor: '#0D6049',
    paddingTop: 8,
    paddingBottom: 4,
  },
  navItem: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  navActive: { backgroundColor: '#0A392C' },
  navIcon: { color: '#71837C', fontSize: 19 },
  navText: { color: '#71837C', fontSize: 10, marginTop: 2 },
  lime: { color: colors.lime },
});
