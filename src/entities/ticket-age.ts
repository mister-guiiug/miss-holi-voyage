/**
 * Classes billet dérivées de la date de naissance à une date de référence
 * (début de fenêtre de voyage, ou aujourd’hui).
 *
 * Règles IATA courantes pour l’avion (les compagnies varient ; documenté
 * comme heuristique, pas comme tarif opposable) :
 * - infant : moins de 2 ans
 * - child  : 2–11 ans
 * - adult  : 12 ans et plus
 *
 * Excursions / attractions (souvent plus strictes côté « adulte ») :
 * - infant : moins de 3 ans (souvent gratuit / non compté)
 * - child  : 3–17 ans
 * - adult  : 18 ans et plus
 *
 * `ageBand` reste un libellé UX ; la billetterie lit `birthDate` en priorité.
 */

export type FlightTicketClass = 'infant' | 'child' | 'adult';
export type ExcursionTicketClass = 'infant' | 'child' | 'adult';
export type AgeBand = 'infant' | 'child' | 'teen' | 'adult' | 'senior';

export function ageInYears(
  birthDateIso: string,
  onDateIso: string = new Date().toISOString().slice(0, 10)
): number | null {
  const birth = parseIsoDate(birthDateIso);
  const on = parseIsoDate(onDateIso);
  if (!birth || !on || on < birth) return null;
  let years = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) years -= 1;
  return years;
}

export function flightTicketClass(
  birthDateIso: string | null | undefined,
  onDateIso?: string,
  fallbackBand?: AgeBand
): FlightTicketClass {
  if (birthDateIso) {
    const age = ageInYears(birthDateIso, onDateIso);
    if (age === null) return 'adult';
    if (age < 2) return 'infant';
    if (age < 12) return 'child';
    return 'adult';
  }
  return bandToFlight(fallbackBand ?? 'adult');
}

export function excursionTicketClass(
  birthDateIso: string | null | undefined,
  onDateIso?: string,
  fallbackBand?: AgeBand
): ExcursionTicketClass {
  if (birthDateIso) {
    const age = ageInYears(birthDateIso, onDateIso);
    if (age === null) return 'adult';
    if (age < 3) return 'infant';
    if (age < 18) return 'child';
    return 'adult';
  }
  return bandToExcursion(fallbackBand ?? 'adult');
}

export function ageBandFromBirthDate(
  birthDateIso: string,
  onDateIso?: string
): AgeBand {
  const age = ageInYears(birthDateIso, onDateIso);
  if (age === null) return 'adult';
  if (age < 2) return 'infant';
  if (age < 12) return 'child';
  if (age < 18) return 'teen';
  if (age >= 65) return 'senior';
  return 'adult';
}

function bandToFlight(band: AgeBand): FlightTicketClass {
  if (band === 'infant') return 'infant';
  if (band === 'child') return 'child';
  return 'adult';
}

function bandToExcursion(band: AgeBand): ExcursionTicketClass {
  if (band === 'infant') return 'infant';
  if (band === 'child' || band === 'teen') return 'child';
  return 'adult';
}

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}
