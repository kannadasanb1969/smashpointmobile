export type TournamentProgress = { label: string; type: 'completed' | 'live' | 'closed' | 'open' };

export type RegistrationState = 'OPEN' | 'CLOSED' | 'UNKNOWN';

const registrationDeadline = (tournament: any) => {
  const date = String(tournament?.registrationCloseDate || tournament?.registrationEndDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = String(tournament?.registrationCloseTime || '').trim() || '23:59:59';
  const value = new Date(`${date}T${time}${time.length === 5 ? ':00' : ''}`);
  return Number.isNaN(value.getTime()) ? null : value.getTime();
};

export function getTournamentLifecycle(tournament: any, category?: any) {
  const categories = Array.isArray(tournament?.categories) ? tournament.categories : [];
  const target = category || null;
  const phase = String(target?.registrationPhase || '').toUpperCase();
  const closedAt = Boolean(target?.registrationClosedAt);
  const explicit = String(
    target?.registrationState || tournament?.registrationState || tournament?.registrationStatus || '',
  ).toUpperCase();
  const deadline = registrationDeadline(tournament);
  const deadlineClosed = deadline != null && Date.now() >= deadline;
  const categoryClosed = phase === 'CLOSED' || closedAt || explicit === 'CLOSED';
  const categoryOpen = phase === 'OPEN' || explicit === 'OPEN';
  const allCategoriesClosed = categories.length > 0 && categories.every((item: any) => {
    const itemPhase = String(item?.registrationPhase || '').toUpperCase();
    return itemPhase === 'CLOSED' || Boolean(item?.registrationClosedAt);
  });
  const anyCategoryOpen = categories.some((item: any) => String(item?.registrationPhase || '').toUpperCase() === 'OPEN');
  const registrationState: RegistrationState = target
    ? categoryClosed || deadlineClosed
      ? 'CLOSED'
      : categoryOpen || !phase
        ? 'OPEN'
        : 'UNKNOWN'
    : allCategoriesClosed || deadlineClosed
      ? 'CLOSED'
      : anyCategoryOpen || !categories.length
        ? 'OPEN'
        : 'UNKNOWN';
  const published = String(tournament?.status || '').toUpperCase() === 'PUBLISHED';
  return {
    registrationState,
    registrationLabel: registrationState === 'CLOSED' ? 'REGISTRATION CLOSED' : registrationState === 'OPEN' ? 'OPEN REGISTRATION' : 'REGISTRATION STATUS UNAVAILABLE',
    canRegister: published && registrationState === 'OPEN',
    deadline,
  };
}

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
  if (['CLOSED', 'REGISTRATION_CLOSED', 'REGISTRATION CLOSED'].includes(explicit) || getTournamentLifecycle(tournament).registrationState === 'CLOSED')
    return { label: 'REGISTRATION CLOSED', type: 'closed' };
  if (
    ['OPEN', 'REGISTRATION_OPEN', 'REGISTRATION OPEN'].includes(explicit) ||
    getTournamentLifecycle(tournament).registrationState === 'OPEN'
  )
    return { label: 'OPEN', type: 'open' };
  return null;
}
