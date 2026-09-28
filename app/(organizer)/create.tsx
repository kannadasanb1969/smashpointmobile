import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { TournamentIcon } from '../../src/components/common/TournamentIcon';
import { SmashConfirmModal } from '../../src/components/common/SmashConfirmModal';
import { useAuthStore } from '../../src/store/authStore';
import { organizerApi, useOrganizerMutation } from '../../src/features/organizer/api';
import { cleanCategories, type OrganizerCategory } from '../../src/features/organizer/helpers';
import { colors, radius, spacing } from '../../src/theme';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';

const EVENT_TYPES: OrganizerCategory['eventType'][] = ['SINGLES', 'DOUBLES'];
const FORMATS = ['KNOCKOUT', 'LEAGUE'] as const;
const WINNING_POINTS = ['15', '21', '30'] as const;
const PRIZE_TYPES = ['NONE', 'TROPHY', 'CASH', 'BOTH'] as const;
const PRIZE_TYPE_COPY: Record<(typeof PRIZE_TYPES)[number], { title: string; sub: string }> = {
  NONE: { title: 'None', sub: 'No prize' },
  TROPHY: { title: 'Trophy', sub: 'Cup / Medal' },
  CASH: { title: 'Cash', sub: 'Prize money' },
  BOTH: { title: 'Both', sub: 'Trophy + Cash' },
};
type FormValues = {
  name: string;
  description: string;
  tournamentDate: string;
  registrationCloseDate: string;
  registrationCloseTime: string;
  reportingTime: string;
  venueName: string;
  venueAddress: string;
  mapLink: string;
  format: (typeof FORMATS)[number];
  rules: string;
  shuttleType: string;
  winningPoints: string;
  registrationFee: string;
  prizeType: (typeof PRIZE_TYPES)[number];
  winnerTrophyName: string;
  runnerUpTrophyName: string;
  winnerCashAmount: string;
  runnerUpCashAmount: string;
  thirdPlaceEnabled: boolean;
  thirdPlaceTrophyName: string;
  thirdPlaceCashAmount: string;
};
const blank = (): OrganizerCategory => ({
  uiKey: Math.random().toString(36),
  name: 'Singles',
  eventType: 'SINGLES',
  genderEligibility: 'ANY',
  minAge: null,
  maxAge: null,
  maxTeams: null,
  medalistsAllowed: true,
  openPlayersAllowed: true,
  beginnerOnly: false,
  pureBeginnerOnly: false,
  additionalRuleNotes: null,
});
const dateFromValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};
const valueFromDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateValid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const timeValue = (value: unknown) => (typeof value === 'string' ? value.slice(0, 5) : '');
const dateFromTimeValue = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  const date = new Date();
  if (match) date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
};
const valueFromTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const reportingTimeValue = (value: string) => {
  const raw = value.trim();
  if (!raw) return undefined;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
};
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const select = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type !== 'dismissed' && date) onChange(valueFromDate(date));
  };
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={s.dateInput}
      >
        <Text style={value ? s.value : s.placeholder}>{value || 'Select date'}</Text>
        <Text style={s.calendar}>📅</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={dateFromValue(value)}
          mode="date"
          display="default"
          onChange={select}
        />
      )}
    </View>
  );
}
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const select = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type !== 'dismissed' && date) onChange(valueFromTime(date));
  };
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={s.dateInput}
      >
        <Text style={value ? s.value : s.placeholder}>{value || 'Select time'}</Text>
        <TournamentIcon name="clock" size={18} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={dateFromTimeValue(value)}
          mode="time"
          display="default"
          is24Hour
          onChange={select}
        />
      )}
    </View>
  );
}
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
export default function Create() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const organizerId = useAuthStore((state) => state.user?.id) || '';
  const mutation = useOrganizerMutation();
  const authUser = useAuthStore((state) => state.user);
  const [values, setValues] = useState<FormValues>({
    name: '',
    description: '',
    tournamentDate: '',
    registrationCloseDate: '',
    registrationCloseTime: '',
    reportingTime: '',
    venueName: '',
    venueAddress: '',
    mapLink: '',
    format: 'KNOCKOUT',
    rules: '',
    shuttleType: '',
    winningPoints: '21',
    registrationFee: '',
    prizeType: 'NONE',
    winnerTrophyName: '',
    runnerUpTrophyName: '',
    winnerCashAmount: '',
    runnerUpCashAmount: '',
    thirdPlaceEnabled: false,
    thirdPlaceTrophyName: '',
    thirdPlaceCashAmount: '',
  });
  // Organizer identity shown read-only on this screen. Editing an existing tournament shows the
  // name/mobile that were snapshotted onto it at creation time (stable even if the organizer's
  // profile changes later); creating a new one previews the current authenticated identity, since
  // that's exactly what the backend will snapshot on save.
  const [organizerSnapshot, setOrganizerSnapshot] = useState<{ name: string; mobile: string } | null>(null);
  const organizerDisplay = organizerSnapshot ?? {
    name: authUser?.fullName || authUser?.name || 'Organizer',
    mobile: authUser?.mobile || '',
  };
  const [categories, setCategories] = useState<OrganizerCategory[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<OrganizerCategory['eventType']>('SINGLES');
  const set = (key: keyof FormValues, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  useEffect(() => {
    if (!id) {
      setCategories([blank()]);
      setLoading(false);
      return;
    }
    organizerApi
      .detail(id)
      .then((x: any) => {
        setValues({
          name: x.name || '',
          description: x.description || '',
          tournamentDate: x.startDate || x.tournamentDate || '',
          registrationCloseDate: x.registrationEndDate || x.registrationCloseDate || '',
          registrationCloseTime: timeValue(x.registrationCloseTime),
          reportingTime: timeValue(x.reportingTime),
          venueName: x.venue || x.venueName || '',
          venueAddress: x.location || x.venueAddress || '',
          mapLink: x.mapLink || '',
          format: FORMATS.includes(x.format) ? x.format : 'KNOCKOUT',
          rules: Array.isArray(x.generalRules)
            ? x.generalRules.join('\n')
            : x.rules || x.tournamentRules || '',
          shuttleType: x.shuttle ?? x.shuttleType ?? '',
          winningPoints: String(x.scoringFormat ?? x.winningPoints ?? x.winning_points ?? '21'),
          registrationFee: x.registrationFee ? String(x.registrationFee) : '',
          prizeType: PRIZE_TYPES.includes(x.prizeType) ? x.prizeType : 'NONE',
          winnerTrophyName: x.winnerTrophyName || '',
          runnerUpTrophyName: x.runnerUpTrophyName || '',
          winnerCashAmount: x.winnerCashAmount != null ? String(x.winnerCashAmount) : '',
          runnerUpCashAmount: x.runnerUpCashAmount != null ? String(x.runnerUpCashAmount) : '',
          thirdPlaceEnabled: Boolean(x.thirdPlaceEnabled),
          thirdPlaceTrophyName: x.thirdPlaceTrophyName || '',
          thirdPlaceCashAmount: x.thirdPlaceCashAmount != null ? String(x.thirdPlaceCashAmount) : '',
        });
        if (x.organizerName || x.organizerMobile) {
          setOrganizerSnapshot({ name: x.organizerName || 'Organizer', mobile: x.organizerMobile || '' });
        }
        setCategories(
          (x.categories || []).map((c: OrganizerCategory) => ({
            ...c,
            uiKey: c.id || Math.random().toString(36),
          })),
        );
      })
      .catch((e) =>
        Alert.alert('Unable to load tournament', e instanceof Error ? e.message : 'Please retry.'),
      )
      .finally(() => setLoading(false));
  }, [id]);
  const availableTypes = useMemo(
    () => EVENT_TYPES.filter((type) => !categories.some((category) => category.eventType === type)),
    [categories],
  );
  const updateCategory = (uiKey: string | undefined, patch: Partial<OrganizerCategory>) =>
    setCategories((all) =>
      all.map((category) => (category.uiKey === uiKey ? { ...category, ...patch } : category)),
    );
  const addCategory = () => {
    if (categories.some((category) => category.eventType === pendingCategory)) return;
    setCategories((all) => [
      ...all,
      {
        ...blank(),
        eventType: pendingCategory,
        name: pendingCategory === 'SINGLES' ? 'Singles' : 'Doubles',
      },
    ]);
    setCategoryPicker(false);
  };
  const save = () => {
    if (!values.name.trim()) return Alert.alert('Check details', 'Tournament name is required.');
    if (!dateValid(values.tournamentDate))
      return Alert.alert('Check details', 'Tournament date is required.');
    if (!dateValid(values.registrationCloseDate))
      return Alert.alert('Check details', 'Registration close date is required.');
    if (values.registrationCloseDate > values.tournamentDate)
      return Alert.alert(
        'Check details',
        'Registration close date must not be after tournament date.',
      );
    if (!categories.length || categories.some((category) => !category.name.trim()))
      return Alert.alert('Check details', 'Select at least one category and provide its name.');
    const money = (value: string) => (value === '' ? null : Number(value));
    const moneyFields: [string, string][] = [
      ['Registration fee', values.registrationFee],
      ['Winner prize', values.winnerCashAmount],
      ['Runner-up prize', values.runnerUpCashAmount],
      ['3rd place prize', values.thirdPlaceCashAmount],
    ];
    for (const [label, value] of moneyFields)
      if (value !== '' && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) < 0))
        return Alert.alert('Check prize', `${label} must be a non-negative amount.`);
    const reportingTime = reportingTimeValue(values.reportingTime);
    if (reportingTime === null) return Alert.alert('Check time', 'Reporting time must use HH:mm.');
    const registrationCloseTime = reportingTimeValue(values.registrationCloseTime);
    if (registrationCloseTime === null)
      return Alert.alert('Check time', 'Registration close time must use HH:mm.');
    // Mirrors the backend's own normalization (tournament.service.js validate()) so the values
    // sent match what will actually be persisted — belt-and-braces, the backend remains
    // authoritative and re-normalizes regardless of what's sent here.
    const trophyApplies = values.prizeType === 'TROPHY' || values.prizeType === 'BOTH';
    const cashApplies = values.prizeType === 'CASH' || values.prizeType === 'BOTH';
    const thirdPlace = values.thirdPlaceEnabled && values.prizeType !== 'NONE';
    const input = {
      name: values.name.trim(),
      description: values.description,
      tournamentDate: values.tournamentDate,
      registrationCloseDate: values.registrationCloseDate,
      ...(reportingTime ? { reportingTime } : {}),
      ...(registrationCloseTime ? { registrationCloseTime } : {}),
      venueName: values.venueName,
      venueAddress: values.venueAddress,
      mapLink: values.mapLink.trim() || undefined,
      format: values.format,
      categories: cleanCategories(categories),
      generalRules: values.rules.trim() ? [values.rules.trim()] : [],
      shuttle: values.shuttleType,
      scoringFormat: values.winningPoints || undefined,
      registrationFee: money(values.registrationFee) ?? 0,
      prizeType: values.prizeType,
      winnerTrophyName: trophyApplies ? values.winnerTrophyName.trim() || null : null,
      runnerUpTrophyName: trophyApplies ? values.runnerUpTrophyName.trim() || null : null,
      winnerCashAmount: cashApplies ? money(values.winnerCashAmount) : null,
      runnerUpCashAmount: cashApplies ? money(values.runnerUpCashAmount) : null,
      thirdPlaceEnabled: thirdPlace,
      thirdPlaceTrophyName: thirdPlace && trophyApplies ? values.thirdPlaceTrophyName.trim() || null : null,
      thirdPlaceCashAmount: thirdPlace && cashApplies ? money(values.thirdPlaceCashAmount) : null,
    };
    mutation.mutate(
      { id, input, organizerId },
      {
        onSuccess: (saved: any) => {
          if (id) {
            setSavedModalVisible(true);
          } else
            router.replace({
              pathname: '/(organizer)/tournament',
              params: { id: String(saved.id) },
            });
        },
        onError: (e) =>
          Alert.alert('Unable to save', e instanceof Error ? e.message : 'Please retry.'),
      },
    );
  };
  if (loading)
    return (
      <ScreenContainer dark>
        <Text style={s.loading}>Loading tournament…</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer dark>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <BackButton variant="dark" fallbackRoute="/(organizer)/" style={s.back} />
          <Text style={s.eyebrow}>ORGANIZER WORKSPACE</Text>
          <Text style={s.title}>{id ? 'Edit Tournament' : 'Create Tournament'}</Text>
          <Section title="Tournament Basics">
            <Field
              label="Tournament Name"
              value={values.name}
              onChangeText={(value) => set('name', value)}
              placeholder="Enter tournament name"
            />
            <Field
              label="Description"
              value={values.description}
              onChangeText={(value) => set('description', value)}
              placeholder="Tell players about this tournament"
              multiline
            />
            <Text style={s.label}>Format</Text>
            <View style={s.segmentRow}>
              {FORMATS.map((format) => (
                <Pressable
                  key={format}
                  onPress={() => setValues((previous) => ({ ...previous, format }))}
                  style={[s.segment, values.format === format && s.segmentActive]}
                >
                  <Text style={[s.segmentText, values.format === format && s.segmentTextActive]}>
                    {format}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
          <Section title="Schedule">
            <DateField
              label="Tournament Date"
              value={values.tournamentDate}
              onChange={(value) => set('tournamentDate', value)}
            />
            <DateField
              label="Registration Close Date"
              value={values.registrationCloseDate}
              onChange={(value) => set('registrationCloseDate', value)}
            />
            <TimeField
              label="Reporting Time"
              value={values.reportingTime}
              onChange={(value) => set('reportingTime', value)}
            />
            <TimeField
              label="Registration Close Time"
              value={values.registrationCloseTime}
              onChange={(value) => set('registrationCloseTime', value)}
            />
          </Section>
          <Section title="Venue">
            <Field
              label="Venue Name"
              value={values.venueName}
              onChangeText={(value) => set('venueName', value)}
              placeholder="Enter venue name"
            />
            <Field
              label="Venue Address"
              value={values.venueAddress}
              onChangeText={(value) => set('venueAddress', value)}
              placeholder="Enter venue address"
              multiline
            />
            <Field
              label="Map Link"
              value={values.mapLink}
              onChangeText={(value) => set('mapLink', value)}
              placeholder="Optional Google Maps link"
            />
          </Section>
          <Section title="Categories">
            <Text style={s.helper}>Choose one or more supported event types.</Text>
            {categories.map((category) => (
              <View style={s.categoryCard} key={category.uiKey}>
                <View style={s.categoryHeader}>
                  <Text style={s.categoryTitle}>🏸 {category.eventType}</Text>
                  <Pressable
                    onPress={() =>
                      setCategories((all) => all.filter((item) => item.uiKey !== category.uiKey))
                    }
                  >
                    <Text style={s.remove}>Remove</Text>
                  </Pressable>
                </View>
                <Field
                  label="Category Name"
                  value={category.name}
                  onChangeText={(value) => updateCategory(category.uiKey, { name: value })}
                  placeholder={category.eventType === 'SINGLES' ? 'Singles' : 'Doubles'}
                />
                <Text style={s.label}>Gender Eligibility</Text>
                <View style={s.segmentRow}>
                  {(['ANY', 'MALE', 'FEMALE', 'MIXED'] as const).map((gender) => (
                    <Pressable
                      key={gender}
                      onPress={() => updateCategory(category.uiKey, { genderEligibility: gender })}
                      style={[
                        s.smallSegment,
                        category.genderEligibility === gender && s.segmentActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.smallSegmentText,
                          category.genderEligibility === gender && s.segmentTextActive,
                        ]}
                      >
                        {gender}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {(['minAge', 'maxAge', 'maxTeams'] as const).map((key) => (
                  <Field
                    key={key}
                    label={
                      key === 'minAge'
                        ? 'Minimum Age'
                        : key === 'maxAge'
                          ? 'Maximum Age'
                          : 'Maximum Teams'
                    }
                    value={category[key] == null ? '' : String(category[key])}
                    onChangeText={(value) =>
                      updateCategory(category.uiKey, { [key]: value === '' ? null : Number(value) })
                    }
                    keyboardType="numeric"
                    placeholder="Optional"
                  />
                ))}
                {(
                  [
                    'medalistsAllowed',
                    'openPlayersAllowed',
                    'beginnerOnly',
                    'pureBeginnerOnly',
                  ] as const
                ).map((key) => (
                  <View style={s.switchRow} key={key}>
                    <Text style={s.switchLabel}>
                      {key === 'medalistsAllowed'
                        ? 'Medalists Allowed'
                        : key === 'openPlayersAllowed'
                          ? 'Open Players Allowed'
                          : key === 'beginnerOnly'
                            ? 'Beginner Only'
                            : 'Pure Beginner Only'}
                    </Text>
                    <Switch
                      value={category[key]}
                      onValueChange={(value) => updateCategory(category.uiKey, { [key]: value })}
                      trackColor={{ false: colors.border, true: colors.lime }}
                      thumbColor={category[key] ? colors.primary : '#f4f4f4'}
                    />
                  </View>
                ))}
              </View>
            ))}
            <Pressable
              disabled={!availableTypes.length}
              onPress={() => {
                setPendingCategory(availableTypes[0] || 'SINGLES');
                setCategoryPicker(true);
              }}
              style={[s.addButton, !availableTypes.length && s.disabled]}
            >
              <Text style={s.addText}>
                {availableTypes.length ? '+ Add Category' : 'All categories added'}
              </Text>
            </Pressable>
          </Section>
          <Section title="Tournament Rules">
            <Field
              label="Rules & Participation Guidelines"
              value={values.rules}
              onChangeText={(value) => set('rules', value)}
              placeholder="Enter tournament rules and participation guidelines"
              multiline
            />
          </Section>
          <Section title="Organizer Details">
            <Text style={s.helper}>This information will be visible to all participants</Text>
            <View style={s.organizerRow}>
              <View style={s.organizerAvatar}>
                <Text style={s.organizerInitial}>{organizerDisplay.name.trim().charAt(0).toUpperCase() || 'O'}</Text>
              </View>
              <View style={s.organizerCopy}>
                <Text style={s.organizerName}>{organizerDisplay.name}</Text>
                <Text style={s.organizerRole}>Organizer</Text>
                {!!organizerDisplay.mobile && (
                  <View style={s.organizerPhoneRow}>
                    <Text style={s.organizerPhoneIcon}>📞</Text>
                    <Text style={s.organizerPhone}>{organizerDisplay.mobile}</Text>
                  </View>
                )}
              </View>
            </View>
          </Section>
          <Section title="Registration Fee">
            <Text style={s.label}>Registration Fee</Text>
            <View style={s.currencyInput}>
              <Text style={s.currencySymbol}>₹</Text>
              <TextInput
                accessibilityLabel="Registration Fee"
                value={values.registrationFee}
                onChangeText={(value) => set('registrationFee', value.replace(/[^0-9.]/g, ''))}
                placeholder="Enter registration fee"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={s.currencyField}
              />
            </View>
            <Text style={s.helper}>
              Leave empty or enter 0 if there is no registration fee. Amount payable per
              registration (per player for Singles, per team entry for Doubles).
            </Text>
          </Section>
          <Section title="Prize & Match Setup">
            <Text style={s.label}>Prize Type</Text>
            <View style={s.prizeGrid}>
              {PRIZE_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setValues((previous) => ({ ...previous, prizeType: type }))}
                  style={[s.prizeOption, values.prizeType === type && s.prizeOptionActive]}
                >
                  <Text
                    style={[s.prizeOptionTitle, values.prizeType === type && s.prizeOptionTitleActive]}
                  >
                    {PRIZE_TYPE_COPY[type].title}
                  </Text>
                  <Text
                    style={[s.prizeOptionSub, values.prizeType === type && s.prizeOptionSubActive]}
                  >
                    {PRIZE_TYPE_COPY[type].sub}
                  </Text>
                </Pressable>
              ))}
            </View>
            {(values.prizeType === 'TROPHY' || values.prizeType === 'BOTH') && (
              <View style={s.subSection}>
                <Text style={s.subSectionTitle}>Trophy Details</Text>
                <Field
                  label="Winner Trophy"
                  value={values.winnerTrophyName}
                  onChangeText={(value) => set('winnerTrophyName', value)}
                  placeholder="e.g. Winner Cup"
                />
                <Field
                  label="Runner-up Trophy"
                  value={values.runnerUpTrophyName}
                  onChangeText={(value) => set('runnerUpTrophyName', value)}
                  placeholder="e.g. Runner-up Cup"
                />
                {values.thirdPlaceEnabled && (
                  <Field
                    label="3rd Place Trophy"
                    value={values.thirdPlaceTrophyName}
                    onChangeText={(value) => set('thirdPlaceTrophyName', value)}
                    placeholder="e.g. 3rd Place Cup"
                  />
                )}
              </View>
            )}
            {(values.prizeType === 'CASH' || values.prizeType === 'BOTH') && (
              <View style={s.subSection}>
                <Text style={s.subSectionTitle}>Cash Prize Details</Text>
                <Field
                  label="Winner Prize (₹)"
                  value={values.winnerCashAmount}
                  onChangeText={(value) => set('winnerCashAmount', value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 10000"
                  keyboardType="numeric"
                />
                <Field
                  label="Runner-up Prize (₹)"
                  value={values.runnerUpCashAmount}
                  onChangeText={(value) => set('runnerUpCashAmount', value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 5000"
                  keyboardType="numeric"
                />
                {values.thirdPlaceEnabled && (
                  <Field
                    label="3rd Place Prize (₹)"
                    value={values.thirdPlaceCashAmount}
                    onChangeText={(value) => set('thirdPlaceCashAmount', value.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 2500"
                    keyboardType="numeric"
                  />
                )}
              </View>
            )}
            {values.prizeType !== 'NONE' && (
              <View style={s.darkSwitchRow}>
                <Text style={s.darkSwitchLabel}>Enable 3rd Place Prize</Text>
                <Switch
                  value={values.thirdPlaceEnabled}
                  onValueChange={(value) =>
                    setValues((previous) => ({ ...previous, thirdPlaceEnabled: value }))
                  }
                  trackColor={{ false: colors.border, true: colors.lime }}
                  thumbColor={values.thirdPlaceEnabled ? colors.primary : '#f4f4f4'}
                />
              </View>
            )}
            <Field
              label="Shuttle Type"
              value={values.shuttleType}
              onChangeText={(value) => set('shuttleType', value)}
              placeholder="Enter shuttle type"
            />
            <Text style={s.label}>Winning Points</Text>
            <View style={s.segmentRow}>
              {WINNING_POINTS.map((points) => (
                <Pressable
                  key={points}
                  onPress={() => set('winningPoints', points)}
                  style={[s.segment, values.winningPoints === points && s.segmentActive]}
                >
                  <Text
                    style={[s.segmentText, values.winningPoints === points && s.segmentTextActive]}
                  >
                    {points}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
          <PrimaryButton
            disabled={mutation.isPending}
            title={mutation.isPending ? 'Submitting…' : id ? 'Save Changes' : 'Create Tournament'}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={categoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryPicker(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setCategoryPicker(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Select Category</Text>
            {availableTypes.map((type) => (
              <Pressable key={type} onPress={() => setPendingCategory(type)} style={s.option}>
                <Text style={[s.radio, pendingCategory === type && s.radioActive]}>●</Text>
                <Text style={s.optionText}>{type}</Text>
              </Pressable>
            ))}
            <PrimaryButton title="Add" onPress={addCategory} />
          </View>
        </Pressable>
      </Modal>
      <SmashConfirmModal
        visible={savedModalVisible}
        title="Saved"
        message="Tournament updated successfully."
        icon="check"
        confirmText="OK"
        showCancel={false}
        variant="primary"
        onConfirm={() => {
          setSavedModalVisible(false);
          router.back();
        }}
        onCancel={() => setSavedModalVisible(false)}
      />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 50 },
  back: { marginTop: spacing.md },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: spacing.xl,
  },
  title: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: spacing.sm },
  section: {
    backgroundColor: '#0B3027',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#18553F',
  },
  sectionTitle: { color: colors.white, fontSize: 19, fontWeight: '900', marginBottom: spacing.md },
  label: { color: '#C6DDD1', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: 13,
    marginBottom: 10,
    color: colors.text,
    fontSize: 15,
  },
  textarea: { minHeight: 92 },
  dateInput: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: { color: colors.text },
  placeholder: { color: colors.muted },
  calendar: { fontSize: 18 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  segment: {
    flex: 1,
    minWidth: 82,
    borderWidth: 1,
    borderColor: '#39705A',
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallSegment: {
    borderWidth: 1,
    borderColor: '#39705A',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segmentText: { color: '#C6DDD1', fontWeight: '900', fontSize: 12 },
  smallSegmentText: { color: '#C6DDD1', fontWeight: '900', fontSize: 11 },
  segmentTextActive: { color: colors.primaryDark },
  helper: { color: '#A8B6B1', fontSize: 12, marginBottom: 10 },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' },
  remove: { color: colors.error, fontWeight: '900' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 7,
  },
  switchLabel: { color: colors.text, fontWeight: '700', flex: 1 },
  addButton: {
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.pill,
    padding: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.45 },
  addText: { color: colors.lime, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.45)' },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: 8,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  radio: { color: colors.border, fontSize: 18, marginRight: 10 },
  radioActive: { color: colors.primary },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  loading: { color: colors.white, marginTop: spacing.xl, fontSize: 18 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(138, 226, 52, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerInitial: { color: colors.lime, fontSize: 18, fontWeight: '900' },
  organizerCopy: { flex: 1 },
  organizerName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  organizerRole: { color: '#8FA59B', fontSize: 11, fontWeight: '700', marginTop: 1 },
  organizerPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  organizerPhoneIcon: { fontSize: 12 },
  organizerPhone: { color: '#C6DDD1', fontSize: 13, fontWeight: '700' },
  currencyInput: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencySymbol: { color: colors.text, fontSize: 15, fontWeight: '900' },
  currencyField: { flex: 1, paddingVertical: 13, color: colors.text, fontSize: 15 },
  prizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  prizeOption: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#39705A',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  prizeOptionActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  prizeOptionTitle: { color: colors.white, fontWeight: '900', fontSize: 14 },
  prizeOptionTitleActive: { color: colors.primaryDark },
  prizeOptionSub: { color: '#8FA59B', fontSize: 11, marginTop: 2 },
  prizeOptionSubActive: { color: colors.primaryDark },
  subSection: { marginTop: spacing.md },
  subSectionTitle: { color: colors.lime, fontSize: 13, fontWeight: '900', marginBottom: 6 },
  darkSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  darkSwitchLabel: { color: colors.white, fontWeight: '800', fontSize: 13, flex: 1 },
});
