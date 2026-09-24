import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { BackButton } from '../../src/components/common/BackButton';
import { adminApi, useAdminDecision } from '../../src/features/admin/api';
import { useAuthStore } from '../../src/store/authStore';
import {
  adminActions,
  recoverWorkflowConflict,
  rejectionReason,
} from '../../src/features/admin/helpers';
import { colors } from '../../src/theme';

export default function Review() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-tournament', id],
    queryFn: () => adminApi.detail(id as string),
    enabled: Boolean(id),
  });
  const mutation = useAdminDecision();
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const actions = adminActions(query.data?.status || '');
  const decide = (action: 'approve' | 'reject' | 'publish') => {
    if (action === 'reject' && !rejectionReason(reason))
      return Alert.alert('Reason required', 'Enter a rejection reason.');
    if (mutation.isPending || !id) return;
    mutation.mutate(
      { id, adminId: user?.id || '', action, reason },
      {
        onSuccess: () => {
          setReason('');
          Alert.alert('Updated', 'Server status refreshed.');
        },
        onError: async (error) => {
          const recovered = await recoverWorkflowConflict(
            error,
            () => query.refetch(),
            () => queryClient.invalidateQueries({ queryKey: ['admin-pending'] }),
          );
          setNotice(
            recovered
              ? 'The tournament changed before your action. Showing the current server status.'
              : error instanceof Error
                ? error.message
                : 'Unable to complete action. Try again.',
          );
        },
      },
    );
  };
  if (!id)
    return (
      <ScreenContainer>
        <BackButton fallbackRoute="/(admin)/" />
        <Text style={s.title}>Tournament not found</Text>
      </ScreenContainer>
    );
  if (query.isLoading)
    return (
      <ScreenContainer>
        <BackButton fallbackRoute="/(admin)/" />
        <Text style={s.title}>Loading review…</Text>
      </ScreenContainer>
    );
  if (query.isError)
    return (
      <ScreenContainer>
        <BackButton fallbackRoute="/(admin)/" />
        <Text style={s.error}>Unable to load review.</Text>
        <PrimaryButton title="Retry" onPress={() => query.refetch()} />
      </ScreenContainer>
    );
  const tournament = query.data;
  if (!tournament)
    return (
      <ScreenContainer>
        <BackButton fallbackRoute="/(admin)/" />
        <Text style={s.title}>Tournament not found</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <ScrollView>
        <BackButton fallbackRoute="/(admin)/" style={s.back} />
        <Text style={s.title}>Review Tournament</Text>
        <Text style={s.name}>{tournament.name || 'Unnamed tournament'}</Text>
        <Text style={s.status}>{tournament.status || 'Status unavailable'}</Text>
        {notice ? <Text style={s.notice}>{notice}</Text> : null}
        <Text style={s.meta}>{tournament.description || 'No description provided.'}</Text>
        <Text style={s.heading}>Categories</Text>
        {(tournament.categories || []).map((category: any) => (
          <Text style={s.card} key={category.id}>
            {category.name || 'Unnamed category'} · {category.eventType || 'Event type unavailable'}
          </Text>
        ))}
        {actions.canApprove && (
          <PrimaryButton
            title={mutation.isPending ? 'Updating…' : 'Approve Tournament'}
            onPress={() =>
              Alert.alert('Approve this tournament?', 'Confirm approval.', [
                { text: 'Cancel' },
                { text: 'Approve', onPress: () => decide('approve') },
              ])
            }
          />
        )}
        {actions.canReject && (
          <>
            <TextInput
              accessibilityLabel="Rejection reason"
              placeholder="Rejection reason"
              value={reason}
              onChangeText={setReason}
              style={s.input}
            />
            <PrimaryButton
              title={mutation.isPending ? 'Updating…' : 'Reject Tournament'}
              onPress={() => decide('reject')}
            />
          </>
        )}
        {tournament.status === 'APPROVED' && (
          <PrimaryButton
            title={mutation.isPending ? 'Publishing…' : 'Publish Tournament'}
            onPress={() =>
              Alert.alert('Publish this tournament?', 'Players will be able to discover it.', [
                { text: 'Cancel' },
                { text: 'Publish', onPress: () => decide('publish') },
              ])
            }
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  back: { marginTop: 25 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginVertical: 18 },
  name: { fontSize: 21, fontWeight: '800', color: colors.text },
  status: { color: colors.primary, fontWeight: '800', marginTop: 8 },
  meta: { color: colors.muted, marginTop: 10 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 24 },
  card: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 14,
    marginTop: 8,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 15,
  },
  error: { color: colors.error },
  notice: { color: colors.warning, marginTop: 12 },
});
