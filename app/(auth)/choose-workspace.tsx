import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { colors, radius, spacing } from '../../src/theme';
import { type Workspace } from '../../src/store/authStore';
import { normalizeAuthMobileDisplay } from '../../src/api/apiClient';

const standardWorkspaces: { key: Workspace; title: string; copy: string; icon: string }[] = [
  {
    key: 'PLAYER',
    title: 'PLAYER',
    copy: 'Play tournaments, manage your profile and results',
    icon: '🏸',
  },
  {
    key: 'ORGANIZER',
    title: 'ORGANIZER',
    copy: 'Create tournaments, manage fixtures and scoring',
    icon: '🏆',
  },
];

export default function ChooseWorkspace() {
  const params = useLocalSearchParams<{ mobile?: string | string[] }>();
  const mobile = Array.isArray(params.mobile) ? params.mobile[0] : params.mobile || '';
  const workspaces =
    normalizeAuthMobileDisplay(mobile) === '8888888888'
      ? [
          ...standardWorkspaces,
          {
            key: 'ADMIN' as const,
            title: 'ADMIN',
            copy: 'Review and manage tournament approvals',
            icon: '🛡️',
          },
        ]
      : standardWorkspaces;
  const choose = (workspace: Workspace) => {
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { mobile, workspace },
    });
  };
  return (
    <ScreenContainer dark>
      <View style={s.page}>
        <Text style={s.brand}>
          Smash<Text style={s.lime}>Point</Text>
        </Text>
        <Text style={s.eyebrow}>WELCOME</Text>
        <Text style={s.title}>How would you like{`\n`}to continue?</Text>
        <Text style={s.copy}>Choose a workspace to get started.</Text>
        <View style={s.cards}>
          {workspaces.map((workspace) => (
            <Pressable
              key={workspace.key}
              accessibilityRole="button"
              onPress={() => choose(workspace.key)}
              style={({ pressed }) => [s.card, pressed && s.pressed]}
            >
              <Text style={s.icon}>{workspace.icon}</Text>
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{workspace.title}</Text>
                <Text style={s.cardCopy}>{workspace.copy}</Text>
              </View>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingTop: spacing.xl },
  brand: { color: colors.white, fontSize: 25, fontWeight: '900' },
  lime: { color: colors.lime },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginTop: 72,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  copy: { color: '#D8EBDD', fontSize: 15, marginTop: spacing.md },
  cards: { gap: spacing.md, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 118,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  icon: { fontSize: 30, width: 50, textAlign: 'center' },
  cardBody: { flex: 1, marginLeft: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  arrow: { color: colors.primary, fontSize: 34, fontWeight: '300', paddingHorizontal: 4 },
});
