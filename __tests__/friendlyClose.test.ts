import { friendlyLifecycleApi } from '../src/features/player/friendly';
import { apiClient } from '../src/api/apiClient';
jest.mock('../src/api/apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
test('close uses the dedicated Friendly close contract', async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { status: 'CLEANUP_PENDING' } });
  await friendlyLifecycleApi.close('friendly-1');
  expect(apiClient.post).toHaveBeenCalledWith('/api/friendly-matches/friendly-1/close', {});
});
