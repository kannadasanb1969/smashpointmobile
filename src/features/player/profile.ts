import { apiClient } from '../../api/apiClient';
import { playerApi } from './api';
export type PlayerProfile = {
  id: string;
  playerCode: string;
  userId: string | null;
  fullName: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  age: number;
  mobile: string;
  location: string;
  playingSince: number;
  experienceYears: number;
  regularPlayer: boolean;
  courtAcademy: string | null;
  profilePhoto: string | null;
  profileStatus: 'ACTIVE' | 'INCOMPLETE';
};
export type ProfileValues = {
  fullName: string;
  gender: '' | 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  location: string;
  playingSince: string;
  regularPlayer: '' | 'YES' | 'NO';
  courtAcademy: string;
};
export const calculateAge = (value: string) => {
  const dob = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  )
    age--;
  return age;
};
export const validateProfile = (v: ProfileValues) => {
  const errors: Partial<Record<keyof ProfileValues, string>> = {};
  if (!v.fullName.trim()) errors.fullName = 'Full name is required';
  else if (v.fullName.length < 2) errors.fullName = 'Full name must be at least 2 characters';
  if (!v.gender) errors.gender = 'Please select your gender';
  if (!v.dob) errors.dob = 'Date of birth is required';
  else {
    const age = calculateAge(v.dob);
    if (new Date(v.dob) > new Date()) errors.dob = 'Date of birth cannot be in the future';
    else if (age < 5) errors.dob = 'Player must be at least 5 years old';
  }
  if (!v.location.trim()) errors.location = 'Location is required';
  const year = Number(v.playingSince);
  if (!v.playingSince) errors.playingSince = 'Playing since is required';
  else if (year > new Date().getFullYear())
    errors.playingSince = 'Playing since cannot be in the future';
  else if (year < 1900) errors.playingSince = 'Playing since year seems too old';
  if (!v.regularPlayer) errors.regularPlayer = 'Please select whether you are a regular player';
  else if (v.regularPlayer === 'YES' && !v.courtAcademy.trim())
    errors.courtAcademy = 'Court/Academy is required when Regular Player is Yes';
  return errors;
};
export const profileValues = (profile?: PlayerProfile | null): ProfileValues => ({
  fullName: profile?.fullName || '',
  gender: profile?.gender || '',
  dob: profile?.dob || '',
  location: profile?.location || '',
  playingSince: profile?.playingSince ? String(profile.playingSince) : '',
  regularPlayer: profile ? (profile.regularPlayer ? 'YES' : 'NO') : '',
  courtAcademy: profile?.courtAcademy || '',
});
export const resolvePlayerProfile = (
  profiles: PlayerProfile[],
  user: { id?: string; mobile?: string } | null | undefined,
) => {
  const userId = user?.id;
  const mobile = user?.mobile;
  return (
    profiles.find((profile) => Boolean(userId) && profile.userId === userId) ??
    profiles.find((profile) => !profile.userId && Boolean(mobile) && profile.mobile === mobile) ??
    null
  );
};
const payload = (v: ProfileValues, mobile: string) => ({
  fullName: v.fullName.trim(),
  gender: v.gender || null,
  dob: v.dob,
  mobile,
  location: v.location.trim(),
  playingSince: Number(v.playingSince),
  regularPlayer: v.regularPlayer === 'YES',
  courtAcademy: v.regularPlayer === 'YES' ? v.courtAcademy.trim() || null : null,
  profilePhoto: null,
  profileStatus: 'ACTIVE',
});
export const profileApi = {
  list: async () => {
    const data = await playerApi.players();
    return Array.isArray(data) ? (data as PlayerProfile[]) : [];
  },
  create: async (v: ProfileValues, mobile: string) =>
    (await apiClient.post<PlayerProfile>('/api/players', payload(v, mobile))).data,
  // POST /api/players never sets user_id on its own (see player.repository.js insert()) — the
  // profile stays permanently unlinked, blocking every identity-gated action (friendly matches,
  // etc.) with "Player profile required", unless this follow-up call is made, matching Web's
  // createPlayerProfile -> linkPlayerToUser flow.
  linkUser: async (playerId: string, userId: string) =>
    (await apiClient.post<PlayerProfile>(`/api/players/${playerId}/link-user`, { userId })).data,
  update: async (id: string, v: ProfileValues, mobile: string) =>
    (await apiClient.put<PlayerProfile>(`/api/players/${id}`, payload(v, mobile))).data,
};
