import {
  classifyFriendlyRequestFailure,
  recoverFriendlyRequestFailure,
} from '../src/features/player/friendly';
test('classifies stale capacity and normal failures', async () => {
  expect(
    classifyFriendlyRequestFailure({ status: 409, message: 'Join request is no longer pending' }),
  ).toBe('WORKFLOW_STALE');
  expect(
    classifyFriendlyRequestFailure({ status: 409, message: 'Friendly match is at capacity' }),
  ).toBe('CAPACITY_FULL');
  expect(classifyFriendlyRequestFailure({ status: 500, message: 'server' })).toBe('NORMAL_ERROR');
  const c = { invalidateQueries: jest.fn().mockResolvedValue(undefined) };
  await recoverFriendlyRequestFailure(c, 'm');
  expect(c.invalidateQueries).toHaveBeenCalledTimes(4);
});
