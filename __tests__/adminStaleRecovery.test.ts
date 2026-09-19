import { recoverWorkflowConflict, adminActions } from '../src/features/admin/helpers';
test('stale approve refetches and recalculates actions without local success', async () => {
  let invalidated = 0;
  let refetched = 0;
  const ok = await recoverWorkflowConflict(
    { status: 409, message: 'INVALID_TOURNAMENT_STATUS_TRANSITION' },
    async () => {
      refetched++;
      return { status: 'APPROVED' };
    },
    async () => {
      invalidated++;
    },
  );
  expect(ok).toBe(true);
  expect(invalidated).toBe(1);
  expect(refetched).toBe(1);
  expect(adminActions('APPROVED').canApprove).toBe(false);
});
test('stale reject has no false local rejection and ordinary errors stay ordinary', async () => {
  let refetched = 0;
  expect(
    await recoverWorkflowConflict(
      { status: 409 },
      async () => {
        refetched++;
      },
      async () => {},
    ),
  ).toBe(true);
  expect(refetched).toBe(1);
  expect(
    await recoverWorkflowConflict(
      { status: 500, message: 'network' },
      async () => {
        refetched++;
      },
      async () => {},
    ),
  ).toBe(false);
  expect(refetched).toBe(1);
});
