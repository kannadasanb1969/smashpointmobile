import { scoringApi, scoringActions } from '../src/features/player/scoring';
import { apiClient } from '../src/api/apiClient';
jest.mock('../src/api/apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
test('scoring helpers use REST contracts and action state', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: {} });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
  await scoringApi.match('m');
  await scoringApi.start('m');
  await scoringApi.score('m', { side: 'A', action: 'INCREMENT' });
  await scoringApi.complete('m');
  expect(apiClient.get).toHaveBeenCalledWith('/api/matches/m');
  expect(apiClient.post).toHaveBeenCalledWith('/api/matches/m/start', {});
  expect(apiClient.post).toHaveBeenCalledWith('/api/matches/m/score', {
    side: 'A',
    action: 'INCREMENT',
  });
  expect(apiClient.post).toHaveBeenCalledWith('/api/matches/m/complete', {});
  expect(
    scoringActions({ authorized: false, status: 'LIVE', scoreA: 1, scoreB: 0, target: 21 })
      .readOnly,
  ).toBe(true);
});
