import { ImageBackground, Pressable, Text, StyleSheet, TextInput, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { BackButton } from '../../../src/components/common/BackButton';
import { TournamentIcon } from '../../../src/components/common/TournamentIcon';
import { friendlyApi, friendlyKeys } from '../../../src/features/player/friendly';
import { validateFriendly } from '../../../src/features/player/friendlyValidation';
import { colors, radius, spacing } from '../../../src/theme';

const heroBg = require('../../../assets/images/image2.png');

export default function Create() {
  const [v, setV] = useState({
    title: '',
    description: '',
    eventType: 'SINGLES',
    format: 'LEAGUE',
    maxPlayers: '6',
  });
  const [error, setError] = useState('');
  const c = useQueryClient();
  const m = useMutation({
    // Backend contract (friendly-match.service.js validate()) has no winningPoints field on create —
    // it's set per-game later, not on the match itself — so only these fields are sent.
    mutationFn: () =>
      friendlyApi.create({
        title: v.title,
        description: v.description,
        eventType: v.eventType,
        format: v.format,
        maxPlayers: Number(v.maxPlayers),
      }),
    onSuccess: (x: any) => {
      void c.invalidateQueries({ queryKey: friendlyKeys.all });
      router.replace({ pathname: '/(player)/friendly/[id]', params: { id: String(x.id) } });
    },
    onError: (e: any) => setError(e?.message || 'Unable to create match.'),
  });
  const setEventType = (eventType: 'SINGLES' | 'DOUBLES') =>
    setV({ ...v, eventType, maxPlayers: eventType === 'DOUBLES' ? '8' : '6' });
  const setFormat = (format: 'LEAGUE' | 'KNOCKOUT') => setV({ ...v, format });
  const submit = () => {
    if (m.isPending) return;
    const e = validateFriendly({
      title: v.title,
      eventType: v.eventType,
      maxPlayers: Number(v.maxPlayers),
    });
    if (e) return setError(e);
    m.mutate();
  };
  return (
    <ScreenContainer dark>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <ImageBackground source={heroBg} style={s.hero} imageStyle={s.heroImage}>
          <View style={s.heroOverlay} pointerEvents="none" />
          <BackButton variant="dark" fallbackRoute="/(player)/friendly" style={s.back} />
          <Text style={s.tagline}>PLAY · CONNECT · IMPROVE</Text>
          <Text style={s.title}>
            Create{'\n'}
            <Text style={s.titleAccent}>Friendly Match</Text>
          </Text>
          <Text style={s.subtitle}>Bring players together for a great game!</Text>
          <View style={s.heroShuttle} pointerEvents="none">
            <TournamentIcon name="shuttle" size={44} />
          </View>
          <View style={s.scriptWrap} pointerEvents="none">
            <Text style={s.script}>Badminton{'\n'}Brings People{'\n'}Together</Text>
            <View style={s.scriptUnderline} />
          </View>
        </ImageBackground>

        <View style={s.card}>
          <View style={s.fieldHeader}>
            <Text style={s.fieldIcon}>✎</Text>
            <Text style={s.fieldLabel}>Title</Text>
            <Text style={s.counter}>{v.title.length}/50</Text>
          </View>
          <TextInput
            placeholder="e.g. Weekend Smash"
            placeholderTextColor={colors.muted}
            value={v.title}
            maxLength={50}
            onChangeText={(x) => setV({ ...v, title: x })}
            style={s.input}
          />

          <View style={s.fieldHeader}>
            <TournamentIcon name="document" size={16} />
            <Text style={s.fieldLabel}>Description</Text>
            <Text style={s.counter}>{v.description.length}/200</Text>
          </View>
          <TextInput
            placeholder="Add match details, location, timing, etc..."
            placeholderTextColor={colors.muted}
            value={v.description}
            maxLength={200}
            multiline
            numberOfLines={3}
            onChangeText={(x) => setV({ ...v, description: x })}
            style={[s.input, s.inputMultiline]}
          />

          <View style={s.fieldHeader}>
            <TournamentIcon name="people" size={16} />
            <Text style={s.fieldLabel}>Total Players</Text>
          </View>
          <View style={s.playersRow}>
            <TextInput
              value={v.maxPlayers}
              onChangeText={(x) => setV({ ...v, maxPlayers: x.replace(/[^0-9]/g, '') })}
              style={[s.input, s.inputPlayers]}
              keyboardType="number-pad"
            />
            <View style={s.playersHint}>
              <Text style={s.hintText}>Singles: 6-16</Text>
              <Text style={s.hintText}>Doubles: 8-16</Text>
            </View>
          </View>

          <View style={s.fieldHeader}>
            <Text style={s.fieldIconEmoji}>🏸</Text>
            <Text style={s.fieldLabel}>Event Type</Text>
          </View>
          <View style={s.choiceRow}>
            <ChoiceCard
              active={v.eventType === 'SINGLES'}
              icon="single"
              label="SINGLES"
              onPress={() => setEventType('SINGLES')}
            />
            <ChoiceCard
              active={v.eventType === 'DOUBLES'}
              icon="people"
              label="DOUBLES"
              onPress={() => setEventType('DOUBLES')}
            />
          </View>

          <View style={s.fieldHeader}>
            <TournamentIcon name="bracket" size={16} />
            <Text style={s.fieldLabel}>Format</Text>
          </View>
          <View style={s.choiceRow}>
            <ChoiceCard
              active={v.format === 'LEAGUE'}
              icon="bars"
              label="LEAGUE"
              onPress={() => setFormat('LEAGUE')}
            />
            <ChoiceCard
              active={v.format === 'KNOCKOUT'}
              icon="bracket"
              label="KNOCKOUT"
              onPress={() => setFormat('KNOCKOUT')}
            />
          </View>

          <View style={s.rules}>
            <View style={s.rulesShuttle} pointerEvents="none">
              <TournamentIcon name="shuttle" size={90} />
            </View>
            <View style={s.rulesHeader}>
              <Text style={s.rulesIconEmoji}>💡</Text>
              <Text style={s.rulesTitle}>Friendly Match Rules</Text>
            </View>
            <Text style={s.rulesItem}>• Singles: Minimum 6 players (Max 16)</Text>
            <Text style={s.rulesItem}>• Doubles: Minimum 8 players (Max 16)</Text>
            <Text style={s.rulesItem}>• Players will request to join and you can approve/reject</Text>
            <Text style={s.rulesItem}>• You can manage fixtures and scoring for this event</Text>
          </View>

          {!!error && <Text style={s.error}>{error}</Text>}

          <PrimaryButton
            disabled={m.isPending}
            title={m.isPending ? '  Creating…' : '🏸  Create Friendly Match   →'}
            onPress={submit}
          />
          <Text style={s.footer}>SMASH TODAY FOR A BETTER TOMORROW</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ChoiceCard({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.choice, active && s.choiceActive]}>
      {active && (
        <View style={s.choiceCheck}>
          <Text style={s.choiceCheckText}>✓</Text>
        </View>
      )}
      <TournamentIcon name={icon} size={26} />
      <Text style={[s.choiceLabel, active && s.choiceLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  hero: { minHeight: 300, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, overflow: 'hidden' },
  heroImage: {},
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 26, 22, 0.4)' },
  back: { marginTop: spacing.sm },
  tagline: { color: '#D7E7E0', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: spacing.md },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: spacing.sm, lineHeight: 36 },
  titleAccent: { color: colors.lime },
  subtitle: { color: '#D7E7E0', fontSize: 13, marginTop: spacing.sm, maxWidth: 220 },
  heroShuttle: { position: 'absolute', top: 70, right: 90, opacity: 0.9 },
  scriptWrap: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, alignItems: 'flex-end' },
  script: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 19,
  },
  scriptUnderline: { width: 40, height: 2, backgroundColor: colors.lime, marginTop: 6 },
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -24,
    padding: spacing.lg,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  fieldIcon: { fontSize: 16, color: colors.text },
  fieldIconEmoji: { fontSize: 16 },
  fieldLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  counter: { color: colors.muted, fontSize: 12 },
  input: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  playersRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inputPlayers: { flex: 1 },
  playersHint: { alignItems: 'flex-end' },
  hintText: { color: colors.muted, fontSize: 12 },
  choiceRow: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  choiceActive: { borderColor: colors.primary, backgroundColor: colors.surfaceTint },
  choiceCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCheckText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  choiceLabel: { color: colors.secondary, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  choiceLabelActive: { color: colors.primary },
  rules: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  rulesShuttle: { position: 'absolute', right: -10, bottom: -10, opacity: 0.15 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rulesIconEmoji: { fontSize: 16 },
  rulesTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: '900' },
  rulesItem: { color: colors.text, fontSize: 13, lineHeight: 22 },
  error: { color: colors.error, marginTop: spacing.md, fontWeight: '700' },
  footer: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
