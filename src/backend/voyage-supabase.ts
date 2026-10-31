import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import {
  emptyVoyageSnapshot,
  type FlightOption,
  type Household,
  type HouseholdMember,
  type PoiCandidate,
  type SpecQuestion,
  type Trip,
  type VoyageSnapshot,
} from '../entities/schemas.ts';
import {
  proposeItineraryStyle,
  proposePois,
  suggestSpecQuestions,
} from '../entities/ai-tools.ts';
import { supabase } from './supabase.ts';
import type { VoyageRepository } from './voyage-ports.ts';

const log = createLogger('voyage-supabase');

/** Client PostgREST — typage lâche : le schéma SQL est la source de vérité. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

async function client(): Promise<Sb> {
  return supabase.getClient();
}

async function sessionUserId(): Promise<string | null> {
  const db = await client();
  const {
    data: { user },
  } = await db.auth.getUser();
  return user?.id ?? null;
}

async function requireUser(): Promise<string> {
  const id = await sessionUserId();
  if (!id) throw new Error('session requise — connectez-vous pour collaborer');
  return id;
}

function iso(value: string | null | undefined): string {
  return value ?? new Date().toISOString();
}

function mapHousehold(row: Record<string, unknown>): Household {
  return {
    id: String(row.id),
    name: String(row.name),
    notes: String(row.notes ?? ''),
    createdAt: iso(row.created_at as string),
    updatedAt: iso(row.updated_at as string),
  };
}

function mapMember(row: Record<string, unknown>): HouseholdMember {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    displayName: String(row.display_name),
    birthDate: (row.birth_date as string | null) ?? null,
    ageBand: (row.age_band as HouseholdMember['ageBand']) ?? 'adult',
    gender: (row.gender as HouseholdMember['gender']) ?? 'unspecified',
    mobilityNotes: String(row.mobility_notes ?? ''),
    foodNotes: String(row.food_notes ?? ''),
    sleepNotes: String(row.sleep_notes ?? ''),
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    position: Number(row.position ?? 0),
  };
}

function mapTrip(row: Record<string, unknown>): Trip {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    title: String(row.title),
    destinationCountry: String(row.destination_country ?? ''),
    destinationRegion: String(row.destination_region ?? ''),
    destinationNotes: String(row.destination_notes ?? ''),
    dateWindowStart: (row.date_window_start as string | null) ?? null,
    dateWindowEnd: (row.date_window_end as string | null) ?? null,
    budgetCeiling:
      row.budget_ceiling == null ? null : Number(row.budget_ceiling),
    budgetCurrency: String(row.budget_currency ?? 'EUR'),
    style: (row.style as Trip['style']) ?? 'undecided',
    styleNotes: String(row.style_notes ?? ''),
    isCurrent: Boolean(row.is_current),
    createdAt: iso(row.created_at as string),
    updatedAt: iso(row.updated_at as string),
  };
}

function mapFlight(f: Record<string, unknown>): FlightOption {
  return {
    id: String(f.id),
    tripId: String(f.trip_id),
    label: String(f.label),
    origin: String(f.origin ?? ''),
    destination: String(f.destination ?? ''),
    departAt: (f.depart_at as string | null) ?? null,
    returnAt: (f.return_at as string | null) ?? null,
    stops: Number(f.stops ?? 0),
    price: f.price == null ? null : Number(f.price),
    currency: String(f.currency ?? 'EUR'),
    baggageNotes: String(f.baggage_notes ?? ''),
    sourceUrl: String(f.source_url ?? ''),
    rawPaste: String(f.raw_paste ?? ''),
  };
}

function mapPoi(p: Record<string, unknown>): PoiCandidate {
  return {
    id: String(p.id),
    tripId: String(p.trip_id),
    name: String(p.name),
    zone: String(p.zone ?? ''),
    durationHours: p.duration_hours == null ? null : Number(p.duration_hours),
    minAge: p.min_age == null ? null : Number(p.min_age),
    seasonNotes: String(p.season_notes ?? ''),
    costBand: (p.cost_band as PoiCandidate['costBand']) ?? 'unknown',
    whyMatch: String(p.why_match ?? ''),
    source: (p.source as PoiCandidate['source']) ?? 'manual',
  };
}

async function loadRemote(): Promise<VoyageSnapshot> {
  const db = await client();
  const snap = emptyVoyageSnapshot();

  const { data: membershipRows, error: memErr } = await db
    .from('household_memberships')
    .select('*');
  if (memErr) throw new Error(memErr.message);
  snap.memberships = (membershipRows ?? []).map(
    (m: Record<string, unknown>) => ({
      householdId: String(m.household_id),
      userId: String(m.user_id),
      role: m.role as VoyageSnapshot['memberships'][number]['role'],
      joinedAt: iso(m.joined_at as string),
    })
  );

  const tables: Array<{
    name: string;
    apply: (rows: Record<string, unknown>[]) => void;
  }> = [
    {
      name: 'households',
      apply: rows => {
        snap.households = rows.map(mapHousehold);
      },
    },
    {
      name: 'household_members',
      apply: rows => {
        snap.members = rows.map(mapMember);
      },
    },
    {
      name: 'trips',
      apply: rows => {
        snap.trips = rows.map(mapTrip);
      },
    },
    {
      name: 'trip_steps',
      apply: rows => {
        snap.steps = rows.map(s => ({
          tripId: String(s.trip_id),
          stepKey: s.step_key as VoyageSnapshot['steps'][number]['stepKey'],
          status:
            (s.status as VoyageSnapshot['steps'][number]['status']) ?? 'draft',
        }));
      },
    },
    {
      name: 'flight_options',
      apply: rows => {
        snap.flights = rows.map(mapFlight);
      },
    },
    {
      name: 'poi_candidates',
      apply: rows => {
        snap.pois = rows.map(mapPoi);
      },
    },
    {
      name: 'poi_votes',
      apply: rows => {
        snap.votes = rows.map(v => ({
          poiId: String(v.poi_id),
          userId: String(v.user_id),
          vote: v.vote as VoyageSnapshot['votes'][number]['vote'],
        }));
      },
    },
    {
      name: 'spec_questions',
      apply: rows => {
        snap.questions = rows.map((q): SpecQuestion => ({
          id: String(q.id),
          tripId: String(q.trip_id),
          prompt: String(q.prompt),
          rationale: String(q.rationale ?? ''),
          priority: Number(q.priority ?? 5),
          answer: String(q.answer ?? ''),
          status: (q.status as SpecQuestion['status']) ?? 'open',
        }));
      },
    },
  ];

  for (const table of tables) {
    const { data, error } = await db.from(table.name).select('*');
    if (error) throw new Error(error.message);
    table.apply((data ?? []) as Record<string, unknown>[]);
  }

  const { data: choiceRows, error: choiceErr } = await db
    .from('flight_choices')
    .select('*');
  if (choiceErr) throw new Error(choiceErr.message);
  for (const c of (choiceRows ?? []) as Record<string, unknown>[]) {
    snap.flightChoices[String(c.trip_id)] = String(c.flight_option_id);
  }

  const { data: decRows, error: decErr } = await db
    .from('decision_log')
    .select('*')
    .order('created_at', { ascending: false });
  if (decErr) throw new Error(decErr.message);
  snap.decisions = ((decRows ?? []) as Record<string, unknown>[]).map(d => ({
    id: String(d.id),
    tripId: String(d.trip_id),
    stepKey: String(d.step_key ?? ''),
    summary: String(d.summary),
    createdAt: iso(d.created_at as string),
  }));

  return snap;
}

/**
 * Port voyage distant (RLS + RPCs 0006). Sans session → magasin local.
 */
export function createSupabaseVoyage(
  fallback: VoyageRepository
): VoyageRepository {
  const withSession = async <T>(
    remote: () => Promise<T>,
    local: () => Promise<T>
  ): Promise<T> => ((await sessionUserId()) ? remote() : local());

  return {
    load: () => withSession(loadRemote, () => fallback.load()),

    async clear() {
      await fallback.clear();
      const uid = await sessionUserId();
      if (!uid) return;
      const db = await client();
      const { data: owned, error } = await db
        .from('household_memberships')
        .select('household_id, role');
      if (error) throw new Error(error.message);
      for (const m of owned ?? []) {
        if (m.role !== 'owner') continue;
        const { error: del } = await db
          .from('households')
          .delete()
          .eq('id', m.household_id);
        if (del) throw new Error(del.message);
      }
    },

    async createHousehold(name, notes = '') {
      return withSession(
        async () => {
          const db = await client();
          const { data, error } = await db.rpc('create_household', {
            p_name: name.trim(),
            p_notes: notes,
          });
          if (error) throw new Error(error.message);
          const { data: row, error: readErr } = await db
            .from('households')
            .select('*')
            .eq('id', String(data))
            .single();
          if (readErr || !row)
            throw new Error(readErr?.message ?? 'foyer introuvable');
          return mapHousehold(row);
        },
        () => fallback.createHousehold(name, notes)
      );
    },

    async updateHousehold(householdId, patch) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const body: Record<string, unknown> = {};
          if (patch.name != null) body.name = patch.name.trim();
          if (patch.notes != null) body.notes = patch.notes;
          const { error } = await db
            .from('households')
            .update(body)
            .eq('id', householdId);
          if (error) throw new Error(error.message);
          const { data: row, error: readErr } = await db
            .from('households')
            .select('*')
            .eq('id', householdId)
            .single();
          if (readErr || !row)
            throw new Error(readErr?.message ?? 'foyer introuvable');
          return mapHousehold(row);
        },
        () => fallback.updateHousehold(householdId, patch)
      );
    },

    async createInvite(householdId) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { data, error } = await db.rpc('create_invitation', {
            p_household: householdId,
            p_role: 'editor',
          });
          if (error) throw new Error(error.message);
          const payload = data as {
            token: string;
            expires_at: string;
          };
          return {
            token: payload.token,
            code: payload.token,
            expiresAt: payload.expires_at,
          };
        },
        () => fallback.createInvite(householdId)
      );
    },

    async acceptInvite(tokenOrCode) {
      const uid = await sessionUserId();
      if (!uid) return fallback.acceptInvite(tokenOrCode);
      try {
        const db = await client();
        const { data, error } = await db.rpc('accept_invitation', {
          p_token: tokenOrCode.trim(),
        });
        if (error) throw new Error(error.message);
        return String((data as { household_id: string }).household_id);
      } catch (cause) {
        log.warn('accept distant échoué, essai local', { cause });
        return fallback.acceptInvite(tokenOrCode);
      }
    },

    async addMember(member) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { data, error } = await db
            .from('household_members')
            .insert({
              household_id: member.householdId,
              display_name: member.displayName,
              birth_date: member.birthDate,
              age_band: member.ageBand,
              gender: member.gender,
              mobility_notes: member.mobilityNotes,
              food_notes: member.foodNotes,
              sleep_notes: member.sleepNotes,
              interests: member.interests,
              position: member.position,
            })
            .select('*')
            .single();
          if (error || !data)
            throw new Error(error?.message ?? 'membre refusé');
          return mapMember(data);
        },
        () => fallback.addMember(member)
      );
    },

    async updateMember(memberId, patch) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const body: Record<string, unknown> = {};
          if (patch.displayName != null) body.display_name = patch.displayName;
          if (patch.birthDate !== undefined) body.birth_date = patch.birthDate;
          if (patch.ageBand != null) body.age_band = patch.ageBand;
          if (patch.gender != null) body.gender = patch.gender;
          if (patch.mobilityNotes != null)
            body.mobility_notes = patch.mobilityNotes;
          if (patch.foodNotes != null) body.food_notes = patch.foodNotes;
          if (patch.sleepNotes != null) body.sleep_notes = patch.sleepNotes;
          if (patch.interests != null) body.interests = patch.interests;
          if (patch.position != null) body.position = patch.position;
          const { error } = await db
            .from('household_members')
            .update(body)
            .eq('id', memberId);
          if (error) throw new Error(error.message);
          const { data, error: readErr } = await db
            .from('household_members')
            .select('*')
            .eq('id', memberId)
            .single();
          if (readErr || !data)
            throw new Error(readErr?.message ?? 'membre introuvable');
          return mapMember(data);
        },
        () => fallback.updateMember(memberId, patch)
      );
    },

    async createTrip(householdId, title) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { data, error } = await db.rpc('create_trip', {
            p_household: householdId,
            p_title: title.trim(),
          });
          if (error) throw new Error(error.message);
          const { data: row, error: readErr } = await db
            .from('trips')
            .select('*')
            .eq('id', String(data))
            .single();
          if (readErr || !row)
            throw new Error(readErr?.message ?? 'voyage introuvable');
          return mapTrip(row);
        },
        () => fallback.createTrip(householdId, title)
      );
    },

    async updateTrip(tripId, patch) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const body: Record<string, unknown> = {};
          if (patch.title != null) body.title = patch.title;
          if (patch.destinationCountry != null)
            body.destination_country = patch.destinationCountry;
          if (patch.destinationRegion != null)
            body.destination_region = patch.destinationRegion;
          if (patch.destinationNotes != null)
            body.destination_notes = patch.destinationNotes;
          if (patch.dateWindowStart !== undefined)
            body.date_window_start = patch.dateWindowStart;
          if (patch.dateWindowEnd !== undefined)
            body.date_window_end = patch.dateWindowEnd;
          if (patch.budgetCeiling !== undefined)
            body.budget_ceiling = patch.budgetCeiling;
          if (patch.budgetCurrency != null)
            body.budget_currency = patch.budgetCurrency;
          if (patch.style != null) body.style = patch.style;
          if (patch.styleNotes != null) body.style_notes = patch.styleNotes;
          if (patch.isCurrent != null) body.is_current = patch.isCurrent;
          const { error } = await db
            .from('trips')
            .update(body)
            .eq('id', tripId);
          if (error) throw new Error(error.message);
          const { data: row, error: readErr } = await db
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();
          if (readErr || !row)
            throw new Error(readErr?.message ?? 'voyage introuvable');
          return mapTrip(row);
        },
        () => fallback.updateTrip(tripId, patch)
      );
    },

    async setStepStatus(tripId, stepKey, status) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { error } = await db.from('trip_steps').upsert(
            {
              trip_id: tripId,
              step_key: stepKey,
              status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'trip_id,step_key' }
          );
          if (error) throw new Error(error.message);
          await db.rpc('log_decision', {
            p_trip: tripId,
            p_step: stepKey,
            p_summary: `Étape ${stepKey} → ${status}`,
          });
        },
        () => fallback.setStepStatus(tripId, stepKey, status)
      );
    },

    async runSuggestQuestions(tripId) {
      return withSession(
        async () => {
          await requireUser();
          const snap = await loadRemote();
          const trip = snap.trips.find(t => t.id === tripId);
          if (!trip) throw new Error('voyage introuvable');
          const members = snap.members.filter(
            m => m.householdId === trip.householdId
          );
          const proposed = suggestSpecQuestions({ trip, members });
          const db = await client();
          for (const q of snap.questions.filter(
            x => x.tripId === tripId && x.status === 'open'
          )) {
            await db.from('spec_questions').delete().eq('id', q.id);
          }
          const inserted: SpecQuestion[] = [];
          for (const q of proposed) {
            const { data, error } = await db
              .from('spec_questions')
              .insert({
                trip_id: tripId,
                prompt: q.prompt,
                rationale: q.rationale,
                priority: q.priority,
                answer: '',
                status: 'open',
              })
              .select('*')
              .single();
            if (error || !data)
              throw new Error(error?.message ?? 'question refusée');
            inserted.push({
              id: String(data.id),
              tripId,
              prompt: q.prompt,
              rationale: q.rationale,
              priority: q.priority,
              answer: '',
              status: 'open',
            });
          }
          return inserted;
        },
        () => fallback.runSuggestQuestions(tripId)
      );
    },

    async answerQuestion(questionId, answer, status = 'answered') {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { error } = await db
            .from('spec_questions')
            .update({ answer, status })
            .eq('id', questionId);
          if (error) throw new Error(error.message);
        },
        () => fallback.answerQuestion(questionId, answer, status)
      );
    },

    async addFlight(option) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { data, error } = await db
            .from('flight_options')
            .insert({
              trip_id: option.tripId,
              label: option.label,
              origin: option.origin,
              destination: option.destination,
              depart_at: option.departAt,
              return_at: option.returnAt,
              stops: option.stops,
              price: option.price,
              currency: option.currency,
              baggage_notes: option.baggageNotes,
              source_url: option.sourceUrl,
              raw_paste: option.rawPaste,
            })
            .select('*')
            .single();
          if (error || !data) throw new Error(error?.message ?? 'vol refusé');
          return mapFlight(data);
        },
        () => fallback.addFlight(option)
      );
    },

    async chooseFlight(tripId, flightOptionId) {
      return withSession(
        async () => {
          const uid = await requireUser();
          const db = await client();
          const { error } = await db.from('flight_choices').upsert(
            {
              trip_id: tripId,
              flight_option_id: flightOptionId,
              chosen_by: uid,
              chosen_at: new Date().toISOString(),
            },
            { onConflict: 'trip_id' }
          );
          if (error) throw new Error(error.message);
        },
        () => fallback.chooseFlight(tripId, flightOptionId)
      );
    },

    async runProposeStyle(tripId) {
      return withSession(
        async () => {
          const snap = await loadRemote();
          const trip = snap.trips.find(t => t.id === tripId);
          if (!trip) throw new Error('voyage introuvable');
          const members = snap.members.filter(
            m => m.householdId === trip.householdId
          );
          return proposeItineraryStyle({ trip, members });
        },
        () => fallback.runProposeStyle(tripId)
      );
    },

    async setStyle(tripId, style, notes = '') {
      return withSession(
        async () => {
          await this.updateTrip(tripId, { style, styleNotes: notes });
        },
        () => fallback.setStyle(tripId, style, notes)
      );
    },

    async runProposePois(tripId) {
      return withSession(
        async () => {
          const snap = await loadRemote();
          const trip = snap.trips.find(t => t.id === tripId);
          if (!trip) throw new Error('voyage introuvable');
          const members = snap.members.filter(
            m => m.householdId === trip.householdId
          );
          const proposed = proposePois({ trip, members });
          const out: PoiCandidate[] = [];
          for (const p of proposed) {
            out.push(await this.addPoi({ ...p, tripId }));
          }
          return out;
        },
        () => fallback.runProposePois(tripId)
      );
    },

    async addPoi(poi) {
      return withSession(
        async () => {
          await requireUser();
          const db = await client();
          const { data, error } = await db
            .from('poi_candidates')
            .insert({
              trip_id: poi.tripId,
              name: poi.name,
              zone: poi.zone,
              duration_hours: poi.durationHours,
              min_age: poi.minAge,
              season_notes: poi.seasonNotes,
              cost_band: poi.costBand,
              why_match: poi.whyMatch,
              source: poi.source,
            })
            .select('*')
            .single();
          if (error || !data) throw new Error(error?.message ?? 'poi refusé');
          return mapPoi(data);
        },
        () => fallback.addPoi(poi)
      );
    },

    async votePoi(poiId, vote) {
      return withSession(
        async () => {
          const uid = await requireUser();
          const db = await client();
          const { error } = await db.from('poi_votes').upsert(
            {
              poi_id: poiId,
              user_id: uid,
              vote,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'poi_id,user_id' }
          );
          if (error) throw new Error(error.message);
        },
        () => fallback.votePoi(poiId, vote)
      );
    },

    async listArtifacts(tripId) {
      return withSession(
        async () => {
          const snap = await loadRemote();
          return snap.artifacts.filter(a => a.tripId === tripId);
        },
        () => fallback.listArtifacts(tripId)
      );
    },
  };
}
