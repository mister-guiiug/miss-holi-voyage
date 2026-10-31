import { z } from 'zod';

export const householdRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export type HouseholdRole = z.infer<typeof householdRoleSchema>;
export const stepStatusSchema = z.enum(['draft', 'ready', 'locked']);
export type StepStatus = z.infer<typeof stepStatusSchema>;
export const tripStepKeySchema = z.enum([
  'destination',
  'specs',
  'dates',
  'flights',
  'style',
  'excursions',
]);
export type TripStepKey = z.infer<typeof tripStepKeySchema>;
export const poiVoteSchema = z.enum(['interested', 'maybe', 'no']);
export type PoiVote = z.infer<typeof poiVoteSchema>;
export const itineraryStyleSchema = z.enum(['hub', 'roadtrip', 'undecided']);
export type ItineraryStyle = z.infer<typeof itineraryStyleSchema>;
export const ageBandSchema = z.enum([
  'infant',
  'child',
  'teen',
  'adult',
  'senior',
]);
export const costBandSchema = z.enum(['free', 'low', 'mid', 'high', 'unknown']);

export const householdSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  notes: z.string().max(2000).default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Household = z.infer<typeof householdSchema>;

export const householdMemberSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  displayName: z.string().min(1).max(80),
  /** ISO `YYYY-MM-DD` — source de vérité pour billetterie avion / excursions. */
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  /** Libellé UX ; recalculé depuis `birthDate` quand elle est connue. */
  ageBand: ageBandSchema.default('adult'),
  mobilityNotes: z.string().max(500).default(''),
  foodNotes: z.string().max(500).default(''),
  sleepNotes: z.string().max(500).default(''),
  interests: z.array(z.string()).default([]),
  position: z.number().int().default(0),
});
export type HouseholdMember = z.infer<typeof householdMemberSchema>;

export const householdMembershipSchema = z.object({
  householdId: z.string().min(1),
  userId: z.string().min(1),
  role: householdRoleSchema,
  joinedAt: z.string(),
});
export type HouseholdMembership = z.infer<typeof householdMembershipSchema>;

export const tripSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  title: z.string().min(1).max(120),
  destinationCountry: z.string().max(80).default(''),
  destinationRegion: z.string().max(120).default(''),
  destinationNotes: z.string().max(2000).default(''),
  dateWindowStart: z.string().nullable().default(null),
  dateWindowEnd: z.string().nullable().default(null),
  budgetCeiling: z.number().nullable().default(null),
  budgetCurrency: z.string().length(3).default('EUR'),
  style: itineraryStyleSchema.default('undecided'),
  styleNotes: z.string().max(2000).default(''),
  isCurrent: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Trip = z.infer<typeof tripSchema>;

export const tripStepSchema = z.object({
  tripId: z.string().min(1),
  stepKey: tripStepKeySchema,
  status: stepStatusSchema.default('draft'),
});
export type TripStep = z.infer<typeof tripStepSchema>;

export const flightOptionSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  label: z.string().min(1).max(120),
  origin: z.string().max(12).default(''),
  destination: z.string().max(12).default(''),
  departAt: z.string().nullable().default(null),
  returnAt: z.string().nullable().default(null),
  stops: z.number().int().min(0).max(6).default(0),
  price: z.number().nullable().default(null),
  currency: z.string().length(3).default('EUR'),
  baggageNotes: z.string().max(500).default(''),
  sourceUrl: z.string().max(2000).default(''),
  rawPaste: z.string().max(8000).default(''),
});
export type FlightOption = z.infer<typeof flightOptionSchema>;

export const poiCandidateSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  name: z.string().min(1).max(160),
  zone: z.string().max(120).default(''),
  durationHours: z.number().nullable().default(null),
  minAge: z.number().int().nullable().default(null),
  seasonNotes: z.string().max(500).default(''),
  costBand: costBandSchema.default('unknown'),
  whyMatch: z.string().max(1000).default(''),
  source: z.enum(['manual', 'ai', 'import']).default('manual'),
});
export type PoiCandidate = z.infer<typeof poiCandidateSchema>;

export const specQuestionSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  prompt: z.string().min(1).max(500),
  rationale: z.string().max(1000).default(''),
  priority: z.number().int().min(1).max(10).default(5),
  answer: z.string().max(2000).default(''),
  status: z.enum(['open', 'answered', 'skipped']).default('open'),
});
export type SpecQuestion = z.infer<typeof specQuestionSchema>;

export const artifactSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  artifactType: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  contentMarkdown: z.string().default(''),
  contentJson: z.record(z.string(), z.unknown()).default({}),
  promptSource: z.string().default(''),
  version: z.number().int().default(1),
});
export type Artifact = z.infer<typeof artifactSchema>;

/** Types d’artefacts W2 — génération UI désactivée en v1. */
export const ARTIFACT_TYPES_W2 = [
  'Fiche_urgences_Pays',
  'Monnaie_Pays_billets_pieces',
  'Mots_debrouillards_Pays',
  'Pourboires_pays',
  'Visa_Pays',
  'Programme_excursions',
  'Google_MyMaps_POI',
] as const;

export const decisionLogEntrySchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  stepKey: z.string().default(''),
  summary: z.string().min(1).max(500),
  createdAt: z.string(),
});
export type DecisionLogEntry = z.infer<typeof decisionLogEntrySchema>;

export const STEP_ORDER = tripStepKeySchema.options;

export const voyageSnapshotSchema = z.object({
  households: z.array(householdSchema),
  memberships: z.array(householdMembershipSchema),
  members: z.array(householdMemberSchema),
  trips: z.array(tripSchema),
  steps: z.array(tripStepSchema),
  flights: z.array(flightOptionSchema),
  flightChoices: z.record(z.string(), z.string()),
  pois: z.array(poiCandidateSchema),
  votes: z.array(
    z.object({
      poiId: z.string(),
      userId: z.string(),
      vote: poiVoteSchema,
    })
  ),
  questions: z.array(specQuestionSchema),
  artifacts: z.array(artifactSchema),
  decisions: z.array(decisionLogEntrySchema),
  inviteTokens: z.array(
    z.object({
      householdId: z.string(),
      token: z.string(),
      role: householdRoleSchema,
      expiresAt: z.string(),
    })
  ),
});
export type VoyageSnapshot = z.infer<typeof voyageSnapshotSchema>;

export function emptyVoyageSnapshot(): VoyageSnapshot {
  return {
    households: [],
    memberships: [],
    members: [],
    trips: [],
    steps: [],
    flights: [],
    flightChoices: {},
    pois: [],
    votes: [],
    questions: [],
    artifacts: [],
    decisions: [],
    inviteTokens: [],
  };
}
