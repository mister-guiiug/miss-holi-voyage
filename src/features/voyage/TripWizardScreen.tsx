import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { STEP_ORDER, ARTIFACT_TYPES_W2 } from '../../entities/schemas.ts';
import { useI18n } from '../../i18n/index.ts';
import { useVoyage } from './store.ts';
import { StyleChoice } from './StyleChoice.tsx';

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
        {t('voyage.tripMissing')} <Link to="/">{t('voyage.backHome')}</Link>
      </p>
    );
  }

  const stepStatus = (key: (typeof STEP_ORDER)[number]) =>
    tripSteps.find(s => s.stepKey === key)?.status ?? 'draft';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold">{trip.title}</h2>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs">
          {STEP_ORDER.map(key => (
            <li
              key={key}
              className="border-border rounded-full border px-2 py-1"
            >
              {key}: {stepStatus(key)}
            </li>
          ))}
        </ol>
      </div>

      {/* W1 — destination */}
      <Card>
        <h3 className="font-semibold">{t('voyage.step.destination')}</h3>
        <div className="mt-3 flex flex-col gap-3">
          <TextField
            label={t('voyage.country')}
            value={country}
            onChange={e => setCountry(e.target.value)}
          />
          <TextField
            label={t('voyage.region')}
            value={region}
            onChange={e => setRegion(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void updateTrip(trip.id, {
                  destinationCountry: country.trim(),
                  destinationRegion: region.trim(),
                }).then(() => setStepStatus(trip.id, 'destination', 'ready'));
              }}
            >
              {t('voyage.markReady')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void setStepStatus(trip.id, 'destination', 'locked')
              }
            >
              {t('voyage.lock')}
            </Button>
          </div>
        </div>
      </Card>

      {/* W1 — specs IA */}
      <Card>
        <h3 className="font-semibold">{t('voyage.step.specs')}</h3>
        <Button
          type="button"
          className="mt-3"
          onClick={() => void suggestQuestions(trip.id)}
        >
          {t('voyage.suggestQuestions')}
        </Button>
        <ul className="mt-4 flex flex-col gap-4">
          {tripQuestions.map(q => (
            <li key={q.id} className="border-border border-b pb-3">
              <p className="font-medium">{q.prompt}</p>
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
        <Button
          type="button"
          className="mt-3"
          variant="secondary"
          onClick={() => void setStepStatus(trip.id, 'specs', 'ready')}
        >
          {t('voyage.markReady')}
        </Button>
      </Card>

      {/* W3 — dates */}
      <Card>
        <h3 className="font-semibold">{t('voyage.step.dates')}</h3>
        <div className="mt-3 flex flex-col gap-3">
          <TextField
            label={t('voyage.dateStart')}
            value={dateStart}
            onChange={e => setDateStart(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
          <TextField
            label={t('voyage.dateEnd')}
            value={dateEnd}
            onChange={e => setDateEnd(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
          <TextField
            label={t('voyage.budget')}
            value={budget}
            onChange={e => setBudget(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => {
              const ceiling = budget.trim() ? Number(budget) : null;
              void updateTrip(trip.id, {
                dateWindowStart: dateStart || null,
                dateWindowEnd: dateEnd || null,
                budgetCeiling:
                  ceiling != null && !Number.isNaN(ceiling) ? ceiling : null,
              }).then(() => setStepStatus(trip.id, 'dates', 'ready'));
            }}
          >
            {t('voyage.markReady')}
          </Button>
        </div>
      </Card>

      {/* W3 — vols */}
      <Card>
        <h3 className="font-semibold">{t('voyage.step.flights')}</h3>
        <form
          className="mt-3 flex flex-col gap-3"
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
                <th className="p-1">{t('voyage.flightLabel')}</th>
                <th className="p-1">{t('voyage.flightPrice')}</th>
                <th className="p-1" />
              </tr>
            </thead>
            <tbody>
              {tripFlights.map(f => (
                <tr key={f.id} className="border-border border-t">
                  <td className="p-1">{f.label}</td>
                  <td className="p-1">
                    {f.price != null ? `${f.price} ${f.currency}` : '—'}
                  </td>
                  <td className="p-1">
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
        <Button
          type="button"
          className="mt-3"
          variant="secondary"
          onClick={() => void setStepStatus(trip.id, 'flights', 'ready')}
        >
          {t('voyage.markReady')}
        </Button>
      </Card>

      {/* W3 — style */}
      <Card>
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
      </Card>

      {/* W3 — excursions */}
      <Card>
        <h3 className="font-semibold">{t('voyage.step.excursions')}</h3>
        <Button
          type="button"
          className="mt-3"
          onClick={() => void proposePois(trip.id)}
        >
          {t('voyage.proposePois')}
        </Button>
        <ul className="mt-4 flex flex-col gap-3">
          {tripPois.map(p => {
            const myVote = votes.find(v => v.poiId === p.id)?.vote;
            return (
              <li key={p.id}>
                <Card>
                  <p className="font-medium">{p.name}</p>
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
                </Card>
              </li>
            );
          })}
        </ul>
        <Button
          type="button"
          className="mt-3"
          variant="secondary"
          onClick={() => void setStepStatus(trip.id, 'excursions', 'ready')}
        >
          {t('voyage.markReady')}
        </Button>
      </Card>

      {/* W2 différé — schéma prêt, pas de génération */}
      <Card>
        <h3 className="font-semibold">{t('voyage.artifactsTitle')}</h3>
        <p className="text-muted mt-2 text-sm">
          {t('voyage.artifactsDeferred')}
        </p>
        <ul className="mt-2 list-inside list-disc text-sm">
          {ARTIFACT_TYPES_W2.map(a => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold">{t('voyage.decisions')}</h3>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {tripDecisions.slice(0, 20).map(d => (
            <li key={d.id}>
              <span className="text-muted">{d.stepKey}</span> — {d.summary}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
