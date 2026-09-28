export type OrganizerCategory = {
  id?: string;
  uiKey?: string;
  name: string;
  eventType: 'SINGLES' | 'DOUBLES';
  genderEligibility: 'MALE' | 'FEMALE' | 'ANY' | 'MIXED';
  minAge: number | null;
  maxAge: number | null;
  maxTeams: number | null;
  medalistsAllowed: boolean;
  openPlayersAllowed: boolean;
  beginnerOnly: boolean;
  pureBeginnerOnly: boolean;
  additionalRuleNotes: string | null;
};
export const normalizeTime = (value: string | null | undefined) => {
  if (!value) return '';
  const m = value.match(/^(\d{2}:\d{2})/);
  return m ? m[1] : '';
};
export const toApiTime = (value: string) => (/^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value);
export const cleanCategories = (categories: OrganizerCategory[]) =>
  categories.map(({ uiKey, ...c }) => c);
// This product has no user-facing Draft workflow — creating a tournament already lands directly
// on PENDING_ADMIN_APPROVAL (organizerApi.createAndSubmit), so that's the normal editable state,
// not an edge case. DRAFT is kept only for the rare orphaned row left if create succeeds but the
// automatic submit step fails; REJECTED stays editable so the organizer can fix it for another
// review. Mirrors the backend's PRE_APPROVAL_STATUSES in tournament.service.js exactly.
const PRE_APPROVAL_STATUSES = ['DRAFT', 'REJECTED', 'PENDING_ADMIN_APPROVAL'];
export const organizerActions = (status: string) => ({
  canEdit: PRE_APPROVAL_STATUSES.includes(status),
  canDelete: PRE_APPROVAL_STATUSES.includes(status),
  canSubmit: ['DRAFT', 'REJECTED'].includes(status),
  canApprove: false,
  canReject: false,
});
export const canMutate = (pending: boolean) => !pending;
