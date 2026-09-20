import { groupByPool, computeStandings } from '../src/features/organizer/fixtureHelpers';

const participant = (id: string, poolId: string, name = id) => ({
  participantId: id,
  poolId,
  displayName: name,
});

const match = (id: string, poolId: string, p1: string, p2: string, opts: any = {}) => ({
  id,
  poolId,
  participant1Id: p1,
  participant2Id: p2,
  status: opts.status ?? 'SCHEDULED',
  winnerId: opts.winnerId ?? null,
  participant1Score: opts.s1 ?? 0,
  participant2Score: opts.s2 ?? 0,
  round: opts.round ?? 1,
});

describe('groupByPool', () => {
  it('scopes matches, participants, and standings to their own pool only', () => {
    const participants = [
      participant('P1', 'poolA'), participant('P2', 'poolA'),
      participant('P3', 'poolB'), participant('P4', 'poolB'),
    ];
    const matches = [
      match('m1', 'poolA', 'P1', 'P2', { status: 'COMPLETED', winnerId: 'P1', s1: 21, s2: 15 }),
      match('m2', 'poolB', 'P3', 'P4', { status: 'COMPLETED', winnerId: 'P4', s1: 10, s2: 21 }),
    ];
    const pools = [{ id: 'poolA', name: 'A', poolOrder: 1 }, { id: 'poolB', name: 'B', poolOrder: 2 }];
    const groups = groupByPool(matches as any, participants, pools);
    expect(groups).toHaveLength(2);
    expect(groups[0].participants.map((p: any) => p.participantId)).toEqual(['P1', 'P2']);
    expect(groups[1].participants.map((p: any) => p.participantId)).toEqual(['P3', 'P4']);
    expect(groups[0].rounds.flatMap((r: any) => r.fixtures.map((f: any) => f.id))).toEqual(['m1']);
    expect(groups[0].standings.find((s: any) => s.participantId === 'P1')?.won).toBe(1);
    expect(groups[1].standings.find((s: any) => s.participantId === 'P4')?.won).toBe(1);
    // Pool A's standings must never include pool B's participants or results.
    expect(groups[0].standings.map((s: any) => s.participantId)).toEqual(['P1', 'P2']);
  });

  it('orders pools by poolOrder regardless of input order', () => {
    const pools = [{ id: 'poolB', name: 'B', poolOrder: 2 }, { id: 'poolA', name: 'A', poolOrder: 1 }];
    const groups = groupByPool([], [], pools);
    expect(groups.map((g) => g.pool.name)).toEqual(['A', 'B']);
  });
});

describe('computeStandings point-difference ranking', () => {
  it('ranks by points, then point difference, then points-for', () => {
    const participants = [participant('A', 'x'), participant('B', 'x'), participant('C', 'x')];
    const matches = [
      match('m1', 'x', 'A', 'B', { status: 'COMPLETED', winnerId: 'A', s1: 21, s2: 5 }),
      match('m2', 'x', 'B', 'C', { status: 'COMPLETED', winnerId: 'C', s1: 10, s2: 21 }),
      match('m3', 'x', 'A', 'C', { status: 'COMPLETED', winnerId: 'C', s1: 15, s2: 21 }),
    ];
    const standings = computeStandings(matches as any, participants);
    expect(standings[0].participantId).toBe('C');
    expect(standings[0].won).toBe(2);
    expect(standings[0].pointDiff).toBe((21 - 10) + (21 - 15));
  });
});
