/**
 * L'export agenda d'un voyage, lu dans le `.ics` réellement produit — comme un
 * client d'agenda le lirait. La mécanique du format (échappement, pliage,
 * CRLF, `DTEND` exclusif, écriture des `VALARM`) appartient au socle et y est
 * testée ; restent les questions du voyage : QUELLES dates partent, sous quel
 * `UID`, avec QUELS rappels, et dans quelle langue.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { unescapeText, unfoldLines } from '@mister-guiiug/dev-pwa-config/ical';
import type { FlightOption, Trip } from '../../entities/schemas.ts';
import { messages } from '../../i18n/messages.ts';
import type { Translate } from '../../i18n/index.ts';
import {
  DAY_BEFORE,
  EVE_AT_18,
  WEEK_BEFORE,
  WEEK_BEFORE_AT_9,
  buildTripIcs,
  tripEventUid,
  tripIcsFileName,
  tripToIcalEvents,
} from './tripIcs.ts';

const fr: Translate = createTranslator(messages, 'fr', 'fr');
const en: Translate = createTranslator(messages, 'en', 'fr');

const DTSTAMP = '20261107T080000Z';
const URL_VOYAGE = 'https://mister-guiiug.github.io/miss-holi-voyage/voyage/t1';

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 't1',
  householdId: 'h1',
  title: 'Été en Écosse',
  destinationCountry: 'Royaume-Uni',
  destinationRegion: 'Écosse',
  destinationNotes: '',
  dateWindowStart: '2027-07-10',
  dateWindowEnd: '2027-07-24',
  budgetCeiling: null,
  budgetCurrency: 'EUR',
  style: 'undecided',
  styleNotes: '',
  isCurrent: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

const flight = (over: Partial<FlightOption> = {}): FlightOption => ({
  id: 'f1',
  tripId: 't1',
  label: 'CDG → EDI, direct',
  origin: '',
  destination: '',
  departAt: null,
  returnAt: null,
  stops: 0,
  price: null,
  currency: 'EUR',
  baggageNotes: '',
  sourceUrl: '',
  rawPaste: '',
  ...over,
});

interface ReadEvent {
  /** La ligne brute, paramètres compris (`DTSTART;VALUE=DATE`). */
  raw: Record<string, string>;
  props: Record<string, string>;
  alarms: Array<Record<string, string>>;
}

/**
 * Relit un `.ics` : dépliage d'abord, puis une propriété par événement, et
 * les rappels à part.
 */
function readEvents(ics: string): ReadEvent[] {
  const events: ReadEvent[] = [];
  let current: ReadEvent | null = null;
  let alarm: Record<string, string> | null = null;
  for (const line of unfoldLines(ics)) {
    if (line === 'BEGIN:VEVENT') current = { raw: {}, props: {}, alarms: [] };
    else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (line === 'BEGIN:VALARM') alarm = {};
    else if (line === 'END:VALARM') {
      if (alarm && current) current.alarms.push(alarm);
      alarm = null;
    } else if (current) {
      const colon = line.indexOf(':');
      const head = line.slice(0, colon);
      const name = head.split(';')[0] ?? '';
      const value = line.slice(colon + 1);
      if (alarm) alarm[name] = unescapeText(value);
      else {
        current.props[name] = unescapeText(value);
        current.raw[head] = value;
      }
    }
  }
  return events;
}

describe('tripToIcalEvents', () => {
  it('la fenêtre de dates : départ et retour en journée entière', () => {
    const [depart, retour] = tripToIcalEvents(
      { trip: trip(), url: URL_VOYAGE },
      fr
    );
    expect(depart).toEqual({
      uid: 'voyage-t1-depart',
      summary: 'Départ : Été en Écosse',
      start: '2027-07-10',
      allDay: true,
      location: 'Écosse, Royaume-Uni',
      url: URL_VOYAGE,
      alarms: [
        {
          minutesBefore: WEEK_BEFORE_AT_9,
          description: 'Dans une semaine : départ pour Été en Écosse',
        },
        {
          minutesBefore: EVE_AT_18,
          description: 'Demain : départ pour Été en Écosse',
        },
      ],
    });
    expect(retour).toEqual({
      uid: 'voyage-t1-retour',
      summary: 'Retour : Été en Écosse',
      start: '2027-07-24',
      allDay: true,
      location: 'Écosse, Royaume-Uni',
      url: URL_VOYAGE,
    });
  });

  it('les rappels : une semaine avant à 9 h, la veille à 18 h', () => {
    expect(WEEK_BEFORE_AT_9).toBe(7 * 24 * 60 - 9 * 60);
    expect(EVE_AT_18).toBe(6 * 60);
    expect(WEEK_BEFORE).toBe(7 * 24 * 60);
    expect(DAY_BEFORE).toBe(24 * 60);
  });

  it('une date absente n’est pas inventée : son événement ne part pas', () => {
    expect(
      tripToIcalEvents({ trip: trip({ dateWindowEnd: null }) }, fr).map(
        e => e.uid
      )
    ).toEqual(['voyage-t1-depart']);
    expect(
      tripToIcalEvents({ trip: trip({ dateWindowStart: null }) }, fr).map(
        e => e.uid
      )
    ).toEqual(['voyage-t1-retour']);
    expect(
      tripToIcalEvents(
        { trip: trip({ dateWindowStart: null, dateWindowEnd: null }) },
        fr
      )
    ).toEqual([]);
  });

  it('l’heure du vol retenu prime sur la fenêtre, sens par sens', () => {
    const [depart, retour] = tripToIcalEvents(
      {
        trip: trip(),
        flight: flight({ departAt: '2027-07-10T08:30:00+02:00' }),
      },
      fr
    );
    expect(depart).toMatchObject({
      start: '2027-07-10T08:30:00+02:00',
      allDay: false,
      description: 'Vol retenu : CDG → EDI, direct',
    });
    // Un départ à l'heure du vol : une semaine, puis un jour avant CETTE heure.
    expect(depart?.alarms?.map(a => a.minutesBefore)).toEqual([
      WEEK_BEFORE,
      DAY_BEFORE,
    ]);
    // Le vol ne dit rien du retour : la fenêtre reste la source.
    expect(retour).toMatchObject({ start: '2027-07-24', allDay: true });
  });

  it('sans destination, ni lieu ni lieu vide', () => {
    const [depart] = tripToIcalEvents(
      { trip: trip({ destinationCountry: '', destinationRegion: '' }) },
      fr
    );
    expect(depart).not.toHaveProperty('location');
    expect(depart).not.toHaveProperty('url');
    expect(depart).not.toHaveProperty('description');
  });

  it('une région qui répète le pays ne s’écrit qu’une fois', () => {
    const [depart] = tripToIcalEvents(
      {
        trip: trip({
          destinationCountry: 'Islande',
          destinationRegion: 'Islande',
        }),
      },
      fr
    );
    expect(depart?.location).toBe('Islande');
  });

  it('parle la langue de l’application', () => {
    const [depart, retour] = tripToIcalEvents({ trip: trip() }, en);
    expect(depart?.summary).toBe('Departure: Été en Écosse');
    expect(retour?.summary).toBe('Return: Été en Écosse');
    expect(depart?.alarms?.map(a => a.description)).toEqual([
      'In one week: departure for Été en Écosse',
      'Tomorrow: departure for Été en Écosse',
    ]);
  });

  it('l’UID : le voyage et le sens, jamais la date', () => {
    expect(tripEventUid('t1', 'depart')).toBe('voyage-t1-depart');
    const avant = tripToIcalEvents({ trip: trip() }, fr).map(e => e.uid);
    const apres = tripToIcalEvents(
      {
        trip: trip({
          title: 'Écosse, version longue',
          dateWindowStart: '2027-08-01',
          dateWindowEnd: '2027-08-20',
        }),
      },
      fr
    ).map(e => e.uid);
    // Dates et titre ont bougé : réimporter DÉPLACE les deux événements.
    expect(apres).toEqual(avant);
  });
});

describe('buildTripIcs', () => {
  const ics = buildTripIcs(
    { trip: trip(), url: URL_VOYAGE },
    { t: fr, dtstamp: DTSTAMP }
  );
  const [depart, retour] = readEvents(ics);

  it('un calendrier complet, en CRLF, au nom du voyage', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics).toContain('PRODID:-//Miss Holi Voyage//Agenda//FR');
    expect(unfoldLines(ics)).toContain(
      'X-WR-CALNAME:Miss Holi Voyage : Été en Écosse'
    );
  });

  it('deux VEVENT en journée entière, jour de fin exclusif', () => {
    expect(readEvents(ics)).toHaveLength(2);
    expect(depart?.raw['DTSTART;VALUE=DATE']).toBe('20270710');
    expect(depart?.raw['DTEND;VALUE=DATE']).toBe('20270711');
    expect(retour?.raw['DTSTART;VALUE=DATE']).toBe('20270724');
    expect(retour?.raw['DTEND;VALUE=DATE']).toBe('20270725');
    expect(depart?.props.SUMMARY).toBe('Départ : Été en Écosse');
    expect(depart?.props.LOCATION).toBe('Écosse, Royaume-Uni');
    expect(depart?.props.URL).toBe(URL_VOYAGE);
  });

  it('les rappels du départ sont des VALARM d’affichage, aux bons décalages', () => {
    expect(depart?.alarms).toEqual([
      {
        ACTION: 'DISPLAY',
        DESCRIPTION: 'Dans une semaine : départ pour Été en Écosse',
        // Sept jours avant minuit, moins 9 h : le 3 juillet à 9 h.
        TRIGGER: '-P6DT15H',
      },
      {
        ACTION: 'DISPLAY',
        DESCRIPTION: 'Demain : départ pour Été en Écosse',
        // La veille à 18 h.
        TRIGGER: '-PT6H',
      },
    ]);
    // Aucun rappel ne sonne avant le retour.
    expect(retour?.alarms).toEqual([]);
  });

  it('un départ à l’heure du vol s’écrit en UTC, avec ses rappels', () => {
    const [vol] = readEvents(
      buildTripIcs(
        {
          trip: trip(),
          flight: flight({ departAt: '2027-07-10T08:30:00+02:00' }),
        },
        { t: fr, dtstamp: DTSTAMP }
      )
    );
    expect(vol?.raw.DTSTART).toBe('20270710T063000Z');
    expect(vol?.props.DESCRIPTION).toBe('Vol retenu : CDG → EDI, direct');
    expect(vol?.alarms.map(a => a.TRIGGER)).toEqual(['-P7D', '-P1D']);
  });

  it('UID stable, suffixé de l’application, et DTSTAMP injecté', () => {
    expect(depart?.props.UID).toBe('voyage-t1-depart@miss-holi-voyage');
    expect(retour?.props.UID).toBe('voyage-t1-retour@miss-holi-voyage');
    expect(depart?.props.DTSTAMP).toBe(DTSTAMP);
  });

  it('un titre saisi ne casse pas le fichier : virgules, points-virgules, retour à la ligne', () => {
    const piege = 'Rome, Naples; et\nBEGIN:VEVENT';
    const lu = readEvents(
      buildTripIcs(
        { trip: trip({ title: piege }) },
        { t: fr, dtstamp: DTSTAMP }
      )
    );
    // Toujours deux événements : le retour à la ligne n'a rien injecté.
    expect(lu).toHaveLength(2);
    expect(lu[0]?.props.SUMMARY).toBe(`Départ : ${piege}`);
  });

  it('aucune date : un calendrier valide, vide', () => {
    const vide = buildTripIcs(
      { trip: trip({ dateWindowStart: null, dateWindowEnd: null }) },
      { t: fr, dtstamp: DTSTAMP }
    );
    expect(vide).toContain('BEGIN:VCALENDAR');
    expect(readEvents(vide)).toEqual([]);
  });
});

describe('tripIcsFileName', () => {
  it('le titre sans accents ni espaces, et la nature traduite', () => {
    expect(tripIcsFileName('Été en Écosse', fr)).toBe(
      'ete-en-ecosse-agenda.ics'
    );
    expect(tripIcsFileName('Rome / Naples 2027', en)).toBe(
      'rome-naples-2027-calendar.ics'
    );
    expect(tripIcsFileName('  ', fr)).toBe('voyage-agenda.ics');
  });
});
