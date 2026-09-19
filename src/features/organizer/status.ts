export type TournamentProgress = { label: string; type: 'completed' | 'live' | 'closed' | 'open' };

export function tournamentStatusLabel(status: unknown): string {
  return String(status || '').toUpperCase() === 'PENDING_ADMIN_APPROVAL'
    ? 'WAITING FOR APPROVAL'
    : String(status || 'STATUS UNAVAILABLE');
}

export function getTournamentDisplayStatus(tournament: any): TournamentProgress | null {
  const explicit = String(
    tournament.completionStatus ||
      tournament.tournamentStatus ||
      tournament.eventStatus ||
      tournament.fixtureStatus ||
      '',
  ).toUpperCase();
  const overall = String(tournament.status || '').toUpperCase();
  if (
    overall === 'COMPLETED' ||
    explicit === 'COMPLETED' ||
    tournament.completed === true ||
    tournament.isCompleted === true
  )
    return { label: 'COMPLETED', type: 'completed' };
  if (
    ['LIVE', 'ACTIVE', 'MATCHES_OPEN', 'MATCHES OPEN'].includes(explicit) ||
    tournament.matchesStarted === true
  )
    return {
      label: explicit === 'MATCHES_OPEN' || explicit === 'MATCHES OPEN' ? 'MATCHES OPEN' : 'LIVE',
      type: 'live',
    };
  const phases = (Array.isArray(tournament.categories) ? tournament.categories : []).map(
    (category: any) => String(category.registrationPhase || '').toUpperCase(),
  );
  const close = String(
    tournament.registrationCloseDate || tournament.registrationEndDate || '',
  ).slice(0, 10);
  const closedByDate =
    /^\d{4}-\d{2}-\d{2}$/.test(close) && new Date().toISOString().slice(0, 10) > close;
  if (
    ['CLOSED', 'REGISTRATION_CLOSED', 'REGISTRATION CLOSED'].includes(explicit) ||
    (phases.length > 0 && phases.every((phase: string) => phase === 'CLOSED')) ||
    closedByDate
  )
    return { label: 'REGISTRATION CLOSED', type: 'closed' };
  if (
    ['OPEN', 'REGISTRATION_OPEN', 'REGISTRATION OPEN'].includes(explicit) ||
    phases.includes('OPEN')
  )
    return { label: 'OPEN', type: 'open' };
  return null;
}
