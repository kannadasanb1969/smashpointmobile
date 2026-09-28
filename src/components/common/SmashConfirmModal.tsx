import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radius, spacing } from '../../theme';
import { TournamentIcon, type TournamentIconName } from './TournamentIcon';

export type SmashConfirmVariant = 'primary' | 'danger';

export function SmashConfirmModal({
  visible,
  title,
  message,
  icon,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  variant = 'primary',
  loading = false,
  dismissOnBackdropPress = false,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  icon?: TournamentIconName;
  confirmText?: string;
  cancelText?: string;
  // For a single-action acknowledgement (e.g. a success notice) rather than a confirm/cancel
  // choice — hides the Cancel button so only `onConfirm` (e.g. "OK") is shown.
  showCancel?: boolean;
  variant?: SmashConfirmVariant;
  loading?: boolean;
  dismissOnBackdropPress?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const requestDismiss = () => {
    if (loading) return;
    onCancel();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestDismiss}>
      <Pressable
        style={s.backdrop}
        onPress={() => (dismissOnBackdropPress ? requestDismiss() : undefined)}
        accessibilityRole="none"
      >
        <View style={s.card} accessibilityViewIsModal onStartShouldSetResponder={() => true}>
          {!!icon && (
            <View style={s.iconCircle}>
              <TournamentIcon name={icon} size={22} />
            </View>
          )}
          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          {children}
          <View style={s.actions}>
            {showCancel && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelText}
                disabled={loading}
                onPress={onCancel}
                style={[s.cancelButton, loading && s.disabled]}
              >
                <Text style={s.cancelText}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmText}
              disabled={loading}
              onPress={onConfirm}
              style={[s.confirmButton, variant === 'danger' && s.confirmButtonDanger, loading && s.disabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={variant === 'danger' ? colors.white : colors.primaryDark} />
              ) : (
                <Text style={[s.confirmText, variant === 'danger' && s.confirmTextDanger]}>{confirmText}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.70)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '88%',
    maxWidth: 420,
    backgroundColor: '#07382E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.28)',
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(138, 226, 52, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.white, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  message: { color: '#A9C9BE', fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, width: '100%' },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.35)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#D7E7E0', fontWeight: '900', fontSize: 14 },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.lime,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmButtonDanger: { backgroundColor: colors.error },
  confirmText: { color: colors.primaryDark, fontWeight: '900', fontSize: 14 },
  confirmTextDanger: { color: colors.white },
  disabled: { opacity: 0.6 },
});
