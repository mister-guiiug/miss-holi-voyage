import type {
  FlightOption,
  Household,
  HouseholdMember,
  PoiCandidate,
  PoiVote,
  SpecQuestion,
  StepStatus,
  Trip,
  TripStepKey,
  VoyageSnapshot,
} from '../entities/schemas.ts';
import type { StyleProposal } from '../entities/ai-tools.ts';
import type { itineraryStyleSchema } from '../entities/schemas.ts';
import type { z } from 'zod';

type ItineraryStyle = z.infer<typeof itineraryStyleSchema>;
type StepKey = TripStepKey;
type Status = StepStatus;

export type { VoyageSnapshot, StyleProposal };

export interface VoyageRepository {
  load(): Promise<VoyageSnapshot>;
  createHousehold(name: string, notes?: string): Promise<Household>;
  createInvite(householdId: string): Promise<{
    token: string;
    code: string;
    expiresAt: string;
  }>;
  /** Accepte un jeton opaque ou un code court XXXX-XXXX. */
  acceptInvite(tokenOrCode: string): Promise<string>;
  addMember(
    member: Omit<HouseholdMember, 'id'> & { id?: string }
  ): Promise<HouseholdMember>;
  updateMember(
    memberId: string,
    patch: Partial<
      Pick<
        HouseholdMember,
        | 'displayName'
        | 'birthDate'
        | 'ageBand'
        | 'gender'
        | 'mobilityNotes'
        | 'foodNotes'
        | 'sleepNotes'
        | 'interests'
        | 'position'
      >
    >
  ): Promise<HouseholdMember>;
  createTrip(householdId: string, title: string): Promise<Trip>;
  updateTrip(tripId: string, patch: Partial<Trip>): Promise<Trip>;
  setStepStatus(
    tripId: string,
    stepKey: StepKey,
    status: Status
  ): Promise<void>;
  runSuggestQuestions(tripId: string): Promise<SpecQuestion[]>;
  answerQuestion(
    questionId: string,
    answer: string,
    status?: SpecQuestion['status']
  ): Promise<void>;
  addFlight(
    option: Omit<FlightOption, 'id'> & { id?: string }
  ): Promise<FlightOption>;
  chooseFlight(tripId: string, flightOptionId: string): Promise<void>;
  runProposeStyle(tripId: string): Promise<StyleProposal[]>;
  setStyle(
    tripId: string,
    style: ItineraryStyle,
    notes?: string
  ): Promise<void>;
  runProposePois(tripId: string): Promise<PoiCandidate[]>;
  addPoi(
    poi: Omit<PoiCandidate, 'id'> & { id?: string }
  ): Promise<PoiCandidate>;
  votePoi(poiId: string, vote: PoiVote): Promise<void>;
  listArtifacts(tripId: string): Promise<VoyageSnapshot['artifacts']>;
}
