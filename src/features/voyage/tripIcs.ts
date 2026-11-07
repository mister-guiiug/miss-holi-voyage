/**
 * Les dates d'un voyage dans l'agenda du foyer : un fichier `.ics` qu'on
 * importe dans Google Agenda, Apple Calendrier, Outlook ou Thunderbird, et qui
 * rappelle le départ à celui qui a fermé l'application.
 *
 * Écrit par le module `ical` du socle (échappement, pliage en octets, `DTEND`
 * exclusif, `VALARM`) : restent ici les questions du voyage — QUELLES dates
 * partent, sous quel `UID`, avec quels rappels, dans quelle langue.
 *
 * CE QUI EST DÉCIDÉ ICI :
 *  - DEUX ÉVÉNEMENTS AU PLUS, le départ et le retour. Le modèle n'a pas
 *    d'étape datée : les « étapes » du parcours (destination, dates, vols…)
 *    sont celles de la décision, pas du séjour, et les excursions n'ont pas de
 *    date. Une date absente n'est pas inventée : son événement ne part pas.
 *  - LA DATE DU VOL RETENU PRIME, quand il en porte une (`departAt`,
 *    `returnAt`) : l'heure est plus précise que la fenêtre de dates. Sinon,
 *    la fenêtre (`dateWindowStart`, `dateWindowEnd`), en journée entière —
 *    la seule forme qui ne glisse pas d'un jour chez un lecteur d'un autre
 *    fuseau.
 *  - DEUX RAPPELS AVANT LE DÉPART, aucun avant le retour : une semaine avant
 *    à 9 h (papiers, valises, animaux à faire garder), puis la veille à 18 h.
 *    Sur un départ à l'heure du vol, une semaine et un jour avant cette heure.
 *    Google Agenda ignore les rappels d'un fichier importé ; Apple, Outlook et
 *    Thunderbird les honorent.
 *  - UN `UID` PAR VOYAGE ET PAR SENS, SANS LA DATE : réimporter après avoir
 *    déplacé le départ DÉPLACE l'événement au lieu d'en ajouter un second.
 */
import { downloadText } from '@mister-guiiug/dev-pwa-config/download';
import {
  ICAL_MIME,
  toIcalendar,
  type IcalEvent,
} from '@mister-guiiug/dev-pwa-config/ical';
import type { FlightOption, Trip } from '../../entities/schemas.ts';
import type { Translate } from '../../i18n/index.ts';

/** Le logiciel qui a écrit le fichier. */
const PROD_ID = '-//Miss Holi Voyage//Agenda//FR';

/** Suffixe d'`UID` : l'application, pas l'export. */
const UID_DOMAIN = 'miss-holi-voyage';

/** Une semaine avant, à 9 h : sept jours avant minuit, moins 9 heures. */
export const WEEK_BEFORE_AT_9 = 7 * 24 * 60 - 9 * 60;

/** La veille à 18 h : sur une journée entière, le début est minuit. */
export const EVE_AT_18 = 6 * 60;

/** Sur un départ à l'heure du vol : une semaine, puis un jour avant. */
export const WEEK_BEFORE = 7 * 24 * 60;
export const DAY_BEFORE = 24 * 60;

/** Le sens d'un événement — FIGÉ : il fait partie de l'`UID`. */
type Leg = 'depart' | 'retour';

export interface TripIcsInput {
  trip: Trip;
  /** Le vol retenu du voyage, s'il y en a un. */
  flight?: FlightOption | null;
  /** L'adresse du voyage dans l'application, posée en `URL`. */
  url?: string;
}

/** `voyage-<id>-depart` : réimporter met à jour, même si la date a bougé. */
export function tripEventUid(tripId: string, leg: Leg): string {
  return `voyage-${tripId}-${leg}`;
}

/** Le lieu : région et pays, ce qui est renseigné. */
function destination(trip: Trip): string {
  return [trip.destinationRegion.trim(), trip.destinationCountry.trim()]
    .filter(Boolean)
    .filter((part, i, all) => all.indexOf(part) === i)
    .join(', ');
}

/** Le moment d'un sens : l'heure du vol, sinon le jour de la fenêtre. */
function when(
  flightAt: string | null | undefined,
  windowDay: string | null
): { start: string; allDay: boolean } | null {
  if (flightAt?.trim()) return { start: flightAt.trim(), allDay: false };
  if (windowDay?.trim()) return { start: windowDay.trim(), allDay: true };
  return null;
}

/**
 * Les événements d'un voyage : départ et retour, ceux dont la date est
 * connue. Pur : le traducteur est passé, pour que l'agenda parle la langue de
 * l'application.
 */
export function tripToIcalEvents(
  { trip, flight, url }: TripIcsInput,
  t: Translate
): IcalEvent[] {
  const title = trip.title;
  const location = destination(trip);
  const common = {
    ...(location ? { location } : {}),
    ...(url ? { url } : {}),
    ...(flight?.label.trim()
      ? { description: t('voyage.ics.flight', { label: flight.label.trim() }) }
      : {}),
  };
  const events: IcalEvent[] = [];

  const depart = when(flight?.departAt, trip.dateWindowStart);
  if (depart) {
    events.push({
      uid: tripEventUid(trip.id, 'depart'),
      summary: t('voyage.ics.departure', { title }),
      start: depart.start,
      allDay: depart.allDay,
      ...common,
      alarms: [
        {
          minutesBefore: depart.allDay ? WEEK_BEFORE_AT_9 : WEEK_BEFORE,
          description: t('voyage.ics.alarmWeek', { title }),
        },
        {
          minutesBefore: depart.allDay ? EVE_AT_18 : DAY_BEFORE,
          description: t('voyage.ics.alarmEve', { title }),
        },
      ],
    });
  }

  const retour = when(flight?.returnAt, trip.dateWindowEnd);
  if (retour) {
    events.push({
      uid: tripEventUid(trip.id, 'retour'),
      summary: t('voyage.ics.return', { title }),
      start: retour.start,
      allDay: retour.allDay,
      ...common,
    });
  }

  return events;
}

/** Le `.ics` complet. Pur : `dtstamp` injectable rend l'export comparable. */
export function buildTripIcs(
  input: TripIcsInput,
  opts: { t: Translate; dtstamp?: string }
): string {
  return toIcalendar(tripToIcalEvents(input, opts.t), {
    name: opts.t('voyage.ics.calName', { title: input.trip.title }),
    prodId: PROD_ID,
    uidDomain: UID_DOMAIN,
    dtstamp: opts.dtstamp,
  });
}

/** Le nom du fichier : le titre du voyage, sans accents ni espaces. */
export function tripIcsFileName(title: string, t: Translate): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${slug || 'voyage'}-${t('voyage.ics.fileSuffix')}.ics`;
}

/** Télécharge le `.ics` du voyage. */
export function downloadTripIcs(input: TripIcsInput, t: Translate): boolean {
  return downloadText(
    buildTripIcs(input, { t }),
    tripIcsFileName(input.trip.title, t),
    ICAL_MIME
  );
}
