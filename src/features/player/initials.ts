export function playerInitial(name?: string | null, fallback = 'P') {
  const value = String(name || '').trim();
  return (value.charAt(0) || fallback).toUpperCase();
}
