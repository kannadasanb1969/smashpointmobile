export const isPendingApproval = (status: string) => status === 'PENDING_ADMIN_APPROVAL';
export const adminActions = (status: string) => ({
  canApprove: isPendingApproval(status),
  canReject: isPendingApproval(status),
  canPublish: status === 'APPROVED',
});
export const rejectionReason = (value: string) => value.trim().length > 0;
export const approvePayload = (adminUserId: string) => ({ adminUserId });
export const rejectPayload = (adminUserId: string, reason: string) => ({ adminUserId, reason });
export const adminQueryKeys = { pending: ['admin-pending'], home: ['admin-home'] };
export const isWorkflowConflict = (error: unknown) => {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    [400, 403, 409].includes(status || 0) ||
    message.includes('status transition') ||
    message.includes('already approved') ||
    message.includes('already rejected')
  );
};
export const canSubmitDecision = (pending: boolean) => !pending;
export const recoverWorkflowConflict = async (
  error: unknown,
  refetch: () => Promise<unknown>,
  invalidate: () => Promise<unknown>,
) => {
  if (!isWorkflowConflict(error)) return false;
  await invalidate();
  await refetch();
  return true;
};
