import { createId } from '@mister-guiiug/dev-pwa-config/id';
import type { z } from 'zod';
import type {
  HouseholdMember,
  PoiCandidate,
  SpecQuestion,
  Trip,
} from './schemas.ts';
import { itineraryStyleSchema } from './schemas.ts';

type ItineraryStyle = z.infer<typeof itineraryStyleSchema>;

export type SpecContext = {
  trip: Trip;
  members: HouseholdMember[];
};

/** Contrat 1 — questions prioritaires à partir des trous du dossier. */
export function suggestSpecQuestions(ctx: SpecContext): SpecQuestion[] {
  const out: Omit<SpecQuestion, 'id'>[] = [];
  const { trip, members } = ctx;
  const hasKids = members.some(m =>
    ['infant', 'child', 'teen'].includes(m.ageBand)
  );

  if (!trip.destinationCountry.trim()) {
    out.push({
      tripId: trip.id,
      prompt: 'Quel pays (ou région) visez-vous en premier ?',
      rationale: 'Sans destination, dates et vols restent hypothétiques.',
      priority: 10,
      answer: '',
      status: 'open',
    });
  }
  if (!trip.dateWindowStart || !trip.dateWindowEnd) {
    out.push({
      tripId: trip.id,
      prompt: 'Quelle fenêtre de dates est réaliste (congés / vacances scolaires) ?',
      rationale: 'Borne les options de vol et la saison des excursions.',
      priority: 9,
      answer: '',
      status: 'open',
    });
  }
  if (trip.budgetCeiling == null) {
    out.push({
      tripId: trip.id,
      prompt: 'Quel plafond budgétaire pour le transport + activités (hors hébergement) ?',
      rationale: 'Filtre le style hub/roadtrip et le coût des POI.',
      priority: 8,
      answer: '',
      status: 'open',
    });
  }
  if (hasKids) {
    out.push({
      tripId: trip.id,
      prompt: 'Quel rythme quotidien pour les enfants (siestes, horaires, durée max d’activité) ?',
      rationale: 'Écarte les journées trop longues et les POI peu adaptés.',
      priority: 8,
      answer: '',
      status: 'open',
    });
  }
  if (!members.some(m => m.foodNotes.trim())) {
    out.push({
      tripId: trip.id,
      prompt: 'Y a-t-il des contraintes alimentaires ou d’accès à la cuisine ?',
      rationale: 'Influence le choix d’hébergement et des zones.',
      priority: 6,
      answer: '',
      status: 'open',
    });
  }
  if (trip.style === 'undecided') {
    out.push({
      tripId: trip.id,
      prompt: 'Préférez-vous une base fixe (hub) ou un enchaînement de lieux (roadtrip) ?',
      rationale: 'Change l’aéroport d’arrivée et la shortlist d’excursions.',
      priority: 7,
      answer: '',
      status: 'open',
    });
  }
  out.push({
    tripId: trip.id,
    prompt: 'Quels intérêts doivent primer (nature, culture, plage, sport, gastronomie) ?',
    rationale: 'Ordonne les propositions de sites.',
    priority: 5,
    answer: '',
    status: 'open',
  });
  out.push({
    tripId: trip.id,
    prompt: 'Acceptez-vous des escales, ou un vol direct est-il non négociable ?',
    rationale: 'Réduit le tableau comparatif des billets.',
    priority: 6,
    answer: '',
    status: 'open',
  });

  return out
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10)
    .map(q => ({ ...q, id: createId('q') }));
}

export type StyleProposal = {
  style: Exclude<ItineraryStyle, 'undecided'>;
  summary: string;
  airportHints: string;
};

/** Contrat 2 — hub vs roadtrip. */
export function proposeItineraryStyle(ctx: SpecContext): StyleProposal[] {
  const { trip, members } = ctx;
  const hasYoungKids = members.some(m =>
    ['infant', 'child'].includes(m.ageBand)
  );
  const country = trip.destinationCountry.trim() || 'la destination';

  const hub: StyleProposal = {
    style: 'hub',
    summary: hasYoungKids
      ? `Base unique près d’un hub pour ${country} : moins de bagages à bouger, journées plus courtes.`
      : `Une ville-étape comme camp de base pour rayonner vers ${country}.`,
    airportHints:
      'Privilégier un aéroport international bien desservi, même si le prix est un peu plus haut.',
  };
  const roadtrip: StyleProposal = {
    style: 'roadtrip',
    summary: `Enchaîner 2–4 zones de ${country} pour varier les paysages et les POI.`,
    airportHints:
      'Vol ouvert (arrivée A / retour B) ou aller-retour sur un hub + location de véhicule.',
  };
  return hasYoungKids ? [hub, roadtrip] : [roadtrip, hub];
}

/** Contrat 3 — propositions POI structurées. */
export function proposePois(ctx: SpecContext): PoiCandidate[] {
  const { trip, members } = ctx;
  const country = trip.destinationCountry.trim() || 'Pays';
  const region = trip.destinationRegion.trim();
  const zone = region || country;
  const hasKids = members.some(m =>
    ['infant', 'child', 'teen'].includes(m.ageBand)
  );
  const style = itineraryStyleSchema.parse(trip.style);

  const base: Array<Omit<PoiCandidate, 'id' | 'tripId'>> = [
    {
      name: `Centre historique — ${zone}`,
      zone,
      durationHours: 3,
      minAge: null,
      seasonNotes: 'Toute saison ; éviter les heures de pointe en été.',
      costBand: 'low',
      whyMatch: 'Découverte douce, adaptable au rythme du foyer.',
      source: 'ai',
    },
    {
      name: `Parc / nature accessible — ${zone}`,
      zone,
      durationHours: hasKids ? 2 : 4,
      minAge: hasKids ? 3 : null,
      seasonNotes: 'Préférer matin ou fin d’après-midi.',
      costBand: 'free',
      whyMatch: hasKids
        ? 'Espace pour se dépenser sans contrainte d’âge forte.'
        : 'Respiration entre les étapes urbaines.',
      source: 'ai',
    },
    {
      name: `Marché local — ${zone}`,
      zone,
      durationHours: 1.5,
      minAge: null,
      seasonNotes: 'Matin en semaine.',
      costBand: 'low',
      whyMatch: 'Repères monnaie / nourriture / mots utiles (lien futur Miss Devises).',
      source: 'ai',
    },
    {
      name: `Musée phare — ${country}`,
      zone,
      durationHours: 2.5,
      minAge: hasKids ? 6 : null,
      seasonNotes: 'Réserver hors week-end si possible.',
      costBand: 'mid',
      whyMatch: 'Ancre culturelle ; durée bornée pour ne pas saturer.',
      source: 'ai',
    },
    {
      name: style === 'roadtrip' ? `Étape paysage route — ${country}` : `Excursion journée hors hub — ${zone}`,
      zone,
      durationHours: style === 'roadtrip' ? 5 : 7,
      minAge: hasKids ? 5 : null,
      seasonNotes: 'Vérifier météo et fatigue du groupe.',
      costBand: 'mid',
      whyMatch:
        style === 'roadtrip'
          ? 'Justifie le style roadtrip sans forcer une étape inutile.'
          : 'Rayon depuis la base sans changer d’hébergement.',
      source: 'ai',
    },
    {
      name: `Activité détente (plage / spa / parc aquatique) — ${zone}`,
      zone,
      durationHours: 3,
      minAge: null,
      seasonNotes: 'Selon saison et âge.',
      costBand: 'mid',
      whyMatch: 'Journée tampon après un long trajet ou un vol.',
      source: 'ai',
    },
  ];

  return base.map(p => ({
    ...p,
    id: createId('poi'),
    tripId: trip.id,
  }));
}
