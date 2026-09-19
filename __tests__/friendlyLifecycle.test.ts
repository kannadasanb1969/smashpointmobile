import { friendlyLifecycleApi } from '../src/features/player/friendly';
import { apiClient } from '../src/api/apiClient';
jest.mock('../src/api/apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
test('friendly lifecycle uses dedicated result and cleanup operations', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: {} });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
  await friendlyLifecycleApi.result('f');
  expect(apiClient.get).toHaveBeenCalledWith('/api/friendly-matches/f/result');
  await friendlyLifecycleApi.close('f');
  await friendlyLifecycleApi.cleanup('f');
  expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/friendly-matches/f/close', {});
  expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/friendly-matches/f/cleanup', {});
});
