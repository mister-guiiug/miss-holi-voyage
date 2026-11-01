import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { VoyageLink } from './VoyageLink.tsx';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { STEP_ORDER, ARTIFACT_TYPES_W2 } from '../../entities/schemas.ts';
import { useI18n } from '../../i18n/index.ts';
import { useVoyage } from './store.ts';
import { StyleChoice } from './StyleChoice.tsx';
import { DestinationStep } from './DestinationStep.tsx';
import { StepActions } from './StepActions.tsx';
import { StepStatusBadge } from './StepStatusBadge.tsx';
import { VoyageSheet } from './VoyageSheet.tsx';

export function TripWizardScreen() {
  const { tripId = '' } = useParams();
  const { t } = useI18n();
  const ready = useVoyage(s => s.ready);
  const load = useVoyage(s => s.load);
  const trips = useVoyage(s => s.trips);
  const steps = useVoyage(s => s.steps);
  const questions = useVoyage(s => s.questions);
  const flights = useVoyage(s => s.flights);
  const flightChoices = useVoyage(s => s.flightChoices);
  const pois = useVoyage(s => s.pois);
  const votes = useVoyage(s => s.votes);
  const decisions = useVoyage(s => s.decisions);
  const styleProposals = useVoyage(s => s.styleProposals);
  const updateTrip = useVoyage(s => s.updateTrip);
  const setStepStatus = useVoyage(s => s.setStepStatus);
  const suggestQuestions = useVoyage(s => s.suggestQuestions);
  const answerQuestion = useVoyage(s => s.answerQuestion);
  const addFlight = useVoyage(s => s.addFlight);
  const chooseFlight = useVoyage(s => s.chooseFlight);
  const proposeStyles = useVoyage(s => s.proposeStyles);
  const setStyle = useVoyage(s => s.setStyle);
  const proposePois = useVoyage(s => s.proposePois);
  const votePoi = useVoyage(s => s.votePoi);

  const trip = trips.find(tr => tr.id === tripId);
  const tripSteps = useMemo(
    () => steps.filter(s => s.tripId === tripId),
    [steps, tripId]
  );
  const tripQuestions = questions.filter(q => q.tripId === tripId);
  const tripFlights = flights.filter(f => f.tripId === tripId);
  const tripPois = pois.filter(p => p.tripId === tripId);
  const tripDecisions = decisions.filter(d => d.tripId === tripId);

  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [budget, setBudget] = useState('');
  const [flightLabel, setFlightLabel] = useState('');
  const [flightPaste, setFlightPaste] = useState('');
  const [flightPrice, setFlightPrice] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!trip) return;
    setCountry(trip.destinationCountry);
    setRegion(trip.destinationRegion);
    setDateStart(trip.dateWindowStart ?? '');
    setDateEnd(trip.dateWindowEnd ?? '');
    setBudget(trip.budgetCeiling != null ? String(trip.budgetCeiling) : '');
  }, [trip]);

  if (!ready) return <SkeletonGroup label={t('voyage.trips')} lines={4} />;
  if (!trip) {
    return (
      <p>
        {t('voyage.tripMissing')}{' '}
        <VoyageLink to="/" className="voyage-ink-link">
          {t('voyage.backHome')}
        </VoyageLink>
      </p>
    );
  }

  const stepStatus = (key: (typeof STEP_ORDER)[number]) =>
    tripSteps.find(s => s.stepKey === key)?.status ?? 'draft';

  return (
    <div className="voyage-shell flex flex-col gap-1">
      <header className="pb-2 pt-1">
        <h2 className="voyage-brand m-0 text-3xl">{trip.title}</h2>
        <ol className="voyage-step-rail" aria-label={t('voyage.stepsOverview')}>
          {STEP_ORDER.map((key, i) => {
            const status = stepStatus(key);
            return (
              <li
                key={key}
                className={`voyage-step-rail__item voyage-step-rail__item--${status}`}
              >
                <span className="voyage-step-rail__num">{i + 1}.</span>
                <span className="voyage-step-rail__label">
                  {t(`voyage.step.${key}`)}
                </span>
                <StepStatusBadge status={status} />
              </li>
            );
          })}
        </ol>
      </header>

      <VoyageSheet
        title={t('voyage.step.destination')}
        status={stepStatus('destination')}
      >
        <DestinationStep
          country={country}
          region={region}
          dateStart={dateStart || trip.dateWindowStart || undefined}
          status={stepStatus('destination')}
          onCountryChange={setCountry}
          onRegionChange={value => {
            setRegion(value);
            void updateTrip(trip.id, { destinationRegion: value });
          }}
          onPick={(dest, place) => {
            const nextRegion = place || dest.region || dest.name;
            setCountry(dest.country);
            setRegion(nextRegion);
            void updateTrip(trip.id, {
              destinationCountry: dest.country,
              destinationRegion: nextRegion,
              destinationNotes: `${dest.summary}\nSource: ${dest.sourceUrl}`,
            }).then(() => {
              if (stepStatus('destination') === 'ready') {
                void setStepStatus(trip.id, 'destination', 'draft');
              }
            });
          }}
          onMarkReady={() => {
            void updateTrip(trip.id, {
              destinationCountry: country.trim(),
              destinationRegion: region.trim(),
            }).then(() => setStepStatus(trip.id, 'destination', 'ready'));
          }}
          onLock={() => void setStepStatus(trip.id, 'destination', 'locked')}
          onUnlock={() => void setStepStatus(trip.id, 'destination', 'ready')}
        />
      </VoyageSheet>

      <VoyageSheet title={t('voyage.step.specs')} status={stepStatus('specs')}>
        <Button type="button" onClick={() => void suggestQuestions(trip.id)}>
          {t('voyage.suggestQuestions')}
        </Button>
        <ul className="mt-4 flex list-none flex-col gap-0 p-0">
          {tripQuestions.map(q => (
            <li
              key={q.id}
              className="border-0 border-b border-solid py-3"
              style={{ borderColor: 'var(--voyage-ink-faint)' }}
            >
              <p className="m-0 font-medium">{q.prompt}</p>
              <p className="text-muted mt-1 text-xs">{q.rationale}</p>
              {q.status === 'answered' ? (
                <p className="mt-2 text-sm">{q.answer}</p>
              ) : (
                <form
                  className="mt-2 flex flex-col gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    const a = answers[q.id]?.trim();
                    if (!a) return;
                    void answerQuestion(q.id, a);
                  }}
                >
                  <TextField
                    label={t('voyage.answer')}
                    value={answers[q.id] ?? ''}
                    onChange={e =>
                      setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                  <Button type="submit" variant="secondary">
                    {t('voyage.saveAnswer')}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <StepActions
          status={stepStatus('specs')}
          onMarkReady={() => void setStepStatus(trip.id, 'specs', 'ready')}
          onLock={() => void setStepStatus(trip.id, 'specs', 'locked')}
          onUnlock={() => void setStepStatus(trip.id, 'specs', 'ready')}
        />
      </VoyageSheet>

      <VoyageSheet title={t('voyage.step.dates')} status={stepStatus('dates')}>
        <div className="voyage-dates flex flex-col gap-3">
          <label className="voyage-dates__field">
            <span className="voyage-dates__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 10h18M8 3v4M16 3v4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="voyage-dates__body">
              <span className="voyage-dates__label">
                {t('voyage.dateStart')}
              </span>
              <input
                className="voyage-dates__input"
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
              />
            </span>
          </label>
          <label className="voyage-dates__field">
            <span className="voyage-dates__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 10h18M8 3v4M16 3v4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="voyage-dates__body">
              <span className="voyage-dates__label">{t('voyage.dateEnd')}</span>
              <input
                className="voyage-dates__input"
                type="date"
                value={dateEnd}
                min={dateStart || undefined}
                onChange={e => setDateEnd(e.target.value)}
              />
            </span>
          </label>
          <TextField
            label={t('voyage.budget')}
            value={budget}
            onChange={e => setBudget(e.target.value)}
          />
          <StepActions
            status={stepStatus('dates')}
            onMarkReady={() => {
              const ceiling = budget.trim() ? Number(budget) : null;
              void updateTrip(trip.id, {
                dateWindowStart: dateStart || null,
                dateWindowEnd: dateEnd || null,
                budgetCeiling:
                  ceiling != null && !Number.isNaN(ceiling) ? ceiling : null,
              }).then(() => setStepStatus(trip.id, 'dates', 'ready'));
            }}
            onLock={() => void setStepStatus(trip.id, 'dates', 'locked')}
            onUnlock={() => void setStepStatus(trip.id, 'dates', 'ready')}
          />
        </div>
      </VoyageSheet>

      <VoyageSheet
        title={t('voyage.step.flights')}
        status={stepStatus('flights')}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (!flightLabel.trim()) return;
            void addFlight(trip.id, flightLabel.trim(), {
              rawPaste: flightPaste,
              price: flightPrice ? Number(flightPrice) : null,
            });
            setFlightLabel('');
            setFlightPaste('');
            setFlightPrice('');
          }}
        >
          <TextField
            label={t('voyage.flightLabel')}
            value={flightLabel}
            onChange={e => setFlightLabel(e.target.value)}
          />
          <TextField
            label={t('voyage.flightPrice')}
            value={flightPrice}
            onChange={e => setFlightPrice(e.target.value)}
          />
          <TextField
            label={t('voyage.flightPaste')}
            value={flightPaste}
            onChange={e => setFlightPaste(e.target.value)}
          />
          <Button type="submit">{t('voyage.addFlight')}</Button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-1 font-medium">{t('voyage.flightLabel')}</th>
                <th className="p-1 font-medium">{t('voyage.flightPrice')}</th>
                <th className="p-1" />
              </tr>
            </thead>
            <tbody>
              {tripFlights.map(f => (
                <tr
                  key={f.id}
                  style={{ borderTop: '1px solid var(--voyage-ink-faint)' }}
                >
                  <td className="p-1 py-2">{f.label}</td>
                  <td className="p-1 py-2">
                    {f.price != null ? `${f.price} ${f.currency}` : '—'}
                  </td>
                  <td className="p-1 py-2">
                    <Button
                      type="button"
                      variant={
                        flightChoices[trip.id] === f.id
                          ? 'primary'
                          : 'secondary'
                      }
                      onClick={() => void chooseFlight(trip.id, f.id)}
                    >
                      {flightChoices[trip.id] === f.id
                        ? t('voyage.chosen')
                        : t('voyage.choose')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <StepActions
          status={stepStatus('flights')}
          onMarkReady={() => void setStepStatus(trip.id, 'flights', 'ready')}
          onLock={() => void setStepStatus(trip.id, 'flights', 'locked')}
          onUnlock={() => void setStepStatus(trip.id, 'flights', 'ready')}
        />
      </VoyageSheet>

      <VoyageSheet title={t('voyage.step.style')} status={stepStatus('style')}>
        <StyleChoice
          currentStyle={trip.style}
          proposals={styleProposals}
          onPropose={() => void proposeStyles(trip.id)}
          onChoose={(style, summary) => {
            void setStyle(trip.id, style, summary).then(() =>
              setStepStatus(trip.id, 'style', 'ready')
            );
          }}
        />
        <StepActions
          status={stepStatus('style')}
          onMarkReady={() => void setStepStatus(trip.id, 'style', 'ready')}
          onLock={() => void setStepStatus(trip.id, 'style', 'locked')}
          onUnlock={() => void setStepStatus(trip.id, 'style', 'ready')}
        />
      </VoyageSheet>

      <VoyageSheet
        title={t('voyage.step.excursions')}
        status={stepStatus('excursions')}
      >
        <Button type="button" onClick={() => void proposePois(trip.id)}>
          {t('voyage.proposePois')}
        </Button>
        <ul className="mt-4 flex list-none flex-col gap-0 p-0">
          {tripPois.map(p => {
            const myVote = votes.find(v => v.poiId === p.id)?.vote;
            return (
              <li
                key={p.id}
                className="py-4"
                style={{ borderBottom: '1px solid var(--voyage-ink-faint)' }}
              >
                <p className="m-0 font-medium">{p.name}</p>
                <p className="text-muted text-xs">
                  {p.zone} · {p.costBand} · {p.durationHours ?? '?'} h
                </p>
                <p className="mt-1 text-sm">{p.whyMatch}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['interested', 'maybe', 'no'] as const).map(v => (
                    <Button
                      key={v}
                      type="button"
                      variant={myVote === v ? 'primary' : 'secondary'}
                      onClick={() => void votePoi(p.id, v)}
                    >
                      {t(`voyage.vote.${v}`)}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <StepActions
          status={stepStatus('excursions')}
          onMarkReady={() => void setStepStatus(trip.id, 'excursions', 'ready')}
          onLock={() => void setStepStatus(trip.id, 'excursions', 'locked')}
          onUnlock={() => void setStepStatus(trip.id, 'excursions', 'ready')}
        />
      </VoyageSheet>

      <VoyageSheet title={t('voyage.artifactsTitle')}>
        <p className="text-muted m-0 text-sm">
          {t('voyage.artifactsDeferred')}
        </p>
        <ul className="mt-2 list-inside list-disc text-sm">
          {ARTIFACT_TYPES_W2.map(a => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </VoyageSheet>

      <VoyageSheet title={t('voyage.decisions')}>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          {tripDecisions.slice(0, 20).map(d => (
            <li key={d.id}>
              <span className="text-muted">{d.stepKey}</span> — {d.summary}
            </li>
          ))}
        </ul>
      </VoyageSheet>
    </div>
  );
}
