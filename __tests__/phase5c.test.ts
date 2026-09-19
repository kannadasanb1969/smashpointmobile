import {
  filterRegistrations,
  filterFixtures,
  groupFixtures,
  fixtureLabel,
  visibleFixtures,
  partnerDisplay,
} from '../src/features/organizer/fixtureHelpers';
describe('Phase 5C production mappings', () => {
  test('filters registrations by stable category id and all', () => {
    const x = [{ categoryId: 'a' }, { categoryId: 'b' }];
    expect(filterRegistrations(x, 'a')).toHaveLength(1);
    expect(filterRegistrations(x)).toHaveLength(2);
  });
  test('groups server fixtures without synthesis', () => {
    const x: any[] = [
      { id: '2', roundNumber: 2, matchNumber: 2 },
      { id: '1', roundNumber: 1, matchNumber: 1 },
    ];
    const g = groupFixtures(x);
    expect(g).toHaveLength(2);
    expect(g.flatMap((x) => x.fixtures)).toHaveLength(2);
  });
  test('safe participant labels and published visibility', () => {
    expect(fixtureLabel(null)).toBe('TBD');
    expect(fixtureLabel({ isBye: true })).toBe('BYE');
    expect(
      visibleFixtures([
        { id: '1', status: 'DRAFT' },
        { id: '2', status: 'PUBLISHED' },
      ] as any),
    ).toHaveLength(1);
  });
  test('partner resolution distinguishes player and guest fallback', () => {
    expect(partnerDisplay({ partnerId: 'p', partnerType: 'PLAYER' }, { p: 'Alex' }, {})).toBe(
      'Alex',
    );
    expect(partnerDisplay({ partnerId: 'g', partnerType: 'GUEST' }, {}, { g: 'Sam' })).toBe('Sam');
    expect(partnerDisplay({ partnerId: 'x' }, {}, {})).toBe('Partner details unavailable');
  });
  test('fixture category filtering uses exact id', () => {
    expect(
      filterFixtures(
        [
          { id: '1', categoryId: 'a' },
          { id: '2', categoryId: 'b' },
        ] as any,
        'b',
      ),
    ).toEqual([{ id: '2', categoryId: 'b' }]);
  });
});
