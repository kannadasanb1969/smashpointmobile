// Shared read-only formatting for tournament registration fee + prize display, used by both the
// organizer and player Tournament Details screens so they render the same structured prize data
// (registrationFee/prizeType/winner*/runnerUp*/thirdPlace* — see tournament.service.js on the
// backend) the same way, instead of each screen re-deriving its own prize copy.
export type PrizeRow = { medal: string; label: string; detail: string };

export const formatCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

export function registrationFeeLabel(tournament: any): string {
  const fee = Number(tournament?.registrationFee ?? 0);
  return fee > 0 ? formatCurrency(fee) : 'FREE';
}

export function prizeRows(tournament: any): PrizeRow[] {
  const type = tournament?.prizeType || 'NONE';
  if (type === 'NONE') return [];
  const trophyApplies = type === 'TROPHY' || type === 'BOTH';
  const cashApplies = type === 'CASH' || type === 'BOTH';
  const combine = (trophy?: string | null, cash?: number | null) => {
    const parts: string[] = [];
    if (trophyApplies && trophy) parts.push(trophy);
    if (cashApplies && cash != null) parts.push(formatCurrency(Number(cash)));
    return parts.join(' + ');
  };
  const rows: PrizeRow[] = [];
  const winner = combine(tournament.winnerTrophyName, tournament.winnerCashAmount);
  if (winner) rows.push({ medal: '🥇', label: 'Winner', detail: winner });
  const runnerUp = combine(tournament.runnerUpTrophyName, tournament.runnerUpCashAmount);
  if (runnerUp) rows.push({ medal: '🥈', label: 'Runner-up', detail: runnerUp });
  if (tournament.thirdPlaceEnabled) {
    const third = combine(tournament.thirdPlaceTrophyName, tournament.thirdPlaceCashAmount);
    if (third) rows.push({ medal: '🥉', label: '3rd Place', detail: third });
  }
  return rows;
}
