import { fixtureIsPublished } from '../src/features/organizer/fixtureHelpers';
test('published fixture cannot show publish action', () => {
  expect(fixtureIsPublished({ id: 'x', status: 'PUBLISHED' })).toBe(true);
  expect(fixtureIsPublished({ id: 'x', status: 'DRAFT' })).toBe(false);
});
