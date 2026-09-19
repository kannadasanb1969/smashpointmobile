import { medalDisplay, resultDisplay } from '../src/features/player/achievements';
import {
  notificationIsUnread,
  unreadNotificationCount,
} from '../src/features/player/notifications';

test('result and medal views preserve winner, runner-up, GOLD/SILVER, singles and doubles context', () => {
  expect(resultDisplay({ winnerName: 'A', runnerUpName: 'B' })).toEqual({
    winner: 'A',
    runnerUp: 'B',
  });
  expect(medalDisplay({ id: '1', position: 'GOLD' })).toBe('GOLD');
  expect(medalDisplay({ id: '2', medalType: 'SILVER' })).toBe('SILVER');
});
test('notification state distinguishes unread items and supports empty state', () => {
  expect(unreadNotificationCount([])).toBe(0);
  expect(notificationIsUnread({ id: '1', isRead: false })).toBe(true);
  expect(
    unreadNotificationCount([
      { id: '1', isRead: false },
      { id: '2', isRead: true },
    ]),
  ).toBe(1);
});
