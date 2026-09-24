import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../theme';

// Single shared back control for every child/detail/create/edit screen in the app. Renders the
// same 44x44 circular '‹' target everywhere (rather than each screen inlining its own text link or
// arrow), and picks light/dark contrast to match the header it sits on.
//
// Uses a plain Unicode glyph, not an icon-font glyph (e.g. Ionicons) — this project deliberately
// avoids icon fonts elsewhere (see TournamentIcon.tsx) after past font-loading issues, so this stays
// consistent with that and can never render as a missing-glyph box.
export function BackButton({
  fallbackRoute,
  variant = 'light',
  onPress,
  style,
}: {
  // Only used if there is no history to go back to (e.g. screen opened via deep link).
  fallbackRoute?: string;
  // 'dark': white arrow on a translucent dark circle, for hero/image headers.
  // 'light': dark-green arrow on a soft tinted circle, for plain light screens.
  variant?: 'dark' | 'light';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const go = () => {
    if (onPress) return onPress();
    if (router.canGoBack()) router.back();
    else if (fallbackRoute) router.replace(fallbackRoute as never);
    else router.back();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={go}
      hitSlop={8}
      style={[s.circle, variant === 'dark' ? s.dark : s.light, style]}
    >
      <Text style={[s.arrow, variant === 'dark' ? s.arrowLight : s.arrowDark]}>‹</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  light: { backgroundColor: colors.surfaceTint },
  arrow: { fontSize: 30, lineHeight: 32, fontWeight: '900', marginLeft: -2 },
  arrowLight: { color: colors.white },
  arrowDark: { color: colors.primaryDark },
});
