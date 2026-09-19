// Friendly-match scoring must live under (player)/, not (organizer)/: the root layout's
// workspace guard (app/_layout.tsx) redirects any PLAYER-workspace user away from every
// (organizer)/* route before it can render, which silently bounced friendly-match "View
// Fixtures" -> tap match -> back to Home for every player, since friendly matches are
// player-owned and never run under an ORGANIZER workspace. Same underlying screen, correct group.
export { default } from '../../../../src/features/matches/MatchScreen';
