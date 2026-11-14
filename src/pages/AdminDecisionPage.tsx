import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { LoadingBlock } from '../components/PageParts';
import useCountUp from '../hooks/useCountUp';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import {
  MODE_LABELS, ROUTE_STATUS_LABELS,
  type DecisionCandidateDto, type DecisionFunnelStepDto, type DecisionGlobalDto, type DecisionRouteDto,
  type DecisionScoreDto, type DecisionWeightsDto, type RouteDecisionDto,
} from '../types/decisions';
import '../styles/decision.css';

// =====================================================================
// תיקון 75: "למה המנוע החליט כך" (Explainability)
// מסך אחד שמראה את ההחלטה של מנוע השידוכים כפי שהייתה ברגע יצירת המסלול:
//   משפך המועמדים (מכל המתנדבים עד הנבחר, ואיזה אלגוריתם סינן בכל שלב) · פירוק הציון של הנבחר ·
//   מי עוד נשקל ולמה לא נבחר · המסלול שנבנה (Knapsack + Held-Karp) · הבחירה הגלובלית (Branch & Bound).
// כתובות: /app/admin/decisions/:routeId · /app/admin/decisions/donation/:donationId
// =====================================================================

type ComponentKey = keyof DecisionWeightsDto;

const COMPONENTS: Array<{ key: ComponentKey; label: string; color: string; hint: (c: DecisionCandidateDto, d: RouteDecisionDto) => string }> = [
  { key: 'distance', label: 'מרחק', color: '#1BBFC4', hint: (c, d) => `${fmt(c.distanceKm)} ק"מ נסיעה, מתוך טווח של ${fmt(d.maxSearchRadiusKm)}` },
  { key: 'urgency', label: 'דחיפות', color: '#EF7A5B', hint: (_c, d) => `ציון הדחיפות של התרומה: ${Math.round(d.anchorUrgency)} מתוך 100` },
  { key: 'capacity', label: 'מקום ברכב', color: '#F0A93B', hint: (c) => c.score.capacity >= 0.999 ? 'קיבולת כפולה ממשקל התרומה ומעלה' : `${Math.round(c.score.capacity * 200)}% ממשקל התרומה` },
  { key: 'reliability', label: 'אמינות', color: '#7F77DD', hint: (c) => `${(c.score.reliability * 5).toFixed(1)} מתוך 5` },
];

const OUTCOMES: Record<string, { label: string; tone: string }> = {
  Chosen: { label: 'נבחר', tone: 'chosen' },
  LowerValue: { label: 'מסלול פחות משתלם', tone: 'neutral' },
  TakenByOtherRoute: { label: 'שובץ למסלול אחר', tone: 'violet' },
  NoRoute: { label: 'אין מסלול אפשרי', tone: 'amber' },
  NotEvaluated: { label: 'לא נבדק', tone: 'muted' },
};

const fmt = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 1 });

const toDate = (iso: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
const hhmm = (iso: string | null | undefined) =>
  iso ? toDate(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—';
const whenText = (iso: string) => {
  const d = toDate(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  const day = days === 0 ? 'היום' : days === 1 ? 'אתמול' : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  return `${day}, ${hhmm(iso)}`;
};

/** הנקודות שכל רכיב תרם לציון (0-100) */
const contributions = (score: DecisionScoreDto, w: DecisionWeightsDto) =>
  COMPONENTS.map((c) => ({ ...c, value: score[c.key], weight: w[c.key], points: score[c.key] * w[c.key] * 100 }));

/** מה בלט אצל הנבחר - משפטים קצרים לראש המסך */
function strengths(c: DecisionCandidateDto, d: RouteDecisionDto): string[] {
  const list: string[] = [];
  if (c.score.distance >= 0.75) list.push(`קרוב לנקודת האיסוף (${fmt(c.distanceKm)} ק"מ)`);
  if (c.score.reliability >= 0.8) list.push(`אמינות גבוהה (${(c.score.reliability * 5).toFixed(1)}/5)`);
  if (c.score.capacity >= 0.999) list.push('יש לו מקום ברכב בשפע');
  if (d.route.stops.length > 1) list.push(`אוסף ${d.route.stops.length} תרומות בנסיעה אחת`);
  if (c.rank === 1 && d.candidates.length > 1) list.push('מקום ראשון בדירוג');
  return list.slice(0, 3);
}

/** מופעל אחרי הציור הראשון - בשביל אנימציות כניסה (גדילת פסים, טבעת הציון) */
function useMounted(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return on;
}

export function AdminDecisionPage() {
  const { routeId, donationId } = useParams();
  const [decision, setDecision] = useState<RouteDecisionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let id = Number(routeId);
        if (!routeId && donationId) {
          const lookup = await fetch(`/api/matches/decisions/by-donation/${donationId}`, { headers: authHeaders() });
          if (!lookup.ok) throw new Error(await readErrorMessage(lookup, 'לא נמצא הסבר לתרומה הזו.'));
          id = ((await lookup.json()) as { routeId: number }).routeId;
        }
        const res = await fetch(`/api/matches/decisions/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error(await readErrorMessage(res, 'לא הצלחנו לטעון את ההסבר.'));
        const data = (await res.json()) as RouteDecisionDto;
        if (!cancelled) setDecision(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'שגיאת תקשורת מול השרת.');
      }
    })();
    return () => { cancelled = true; };
  }, [routeId, donationId]);

  if (error) {
    return (
      <div className="dc-page" dir="rtl">
        <BackLink />
        <div className="dc-card dc-empty">
          <span className="dc-empty-icon" aria-hidden="true">?</span>
          <h2>אין כאן הסבר</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  if (!decision) return <LoadingBlock text="טוען את ההחלטה..." />;
  return <DecisionView d={decision} />;
}

function BackLink() {
  return (
    <RouterLink to="/app/admin/matching" className="dc-back">
      <span aria-hidden="true">→</span> למנוע השידוכים
    </RouterLink>
  );
}

function DecisionView({ d }: { d: RouteDecisionDto }) {
  const chosen = d.candidates.find((c) => c.outcome === 'Chosen') ?? d.candidates[0];
  const name = d.volunteerName || chosen?.name || 'המתנדב';
  const firstName = name.split(/\s+/)[0];
  const extraStops = d.route.stops.filter((s) => !s.isAnchor).length;

  return (
    <div className="dc-page" dir="rtl">
      <BackLink />

      {/* ---------- ראש המסך ---------- */}
      <section className="dc-card dc-hero">
        <div className="dc-hero-text">
          <p className="dc-eyebrow">מנוע השידוכים · החלטה על מסלול #{d.routeId}</p>
          <h1>למה {firstName}?</h1>
          <p className="dc-sub">
            תרומה #{d.anchorDonationId} · {fmt(d.anchorWeightKg)} ק"ג
            {extraStops > 0 ? ` (ועוד ${extraStops} בדרך)` : ''}
            {d.route.ngoName ? ` · אל ${d.route.ngoName}` : ''}
          </p>
          <div className="dc-pills">
            <span className="dc-pill is-teal">{MODE_LABELS[d.mode] ?? d.mode}</span>
            <span className="dc-pill">{whenText(d.decidedAt)}</span>
            {d.routeStatus && <span className="dc-pill">{ROUTE_STATUS_LABELS[d.routeStatus] ?? d.routeStatus}</span>}
          </div>
          {chosen && strengths(chosen, d).length > 0 && (
            <ul className="dc-strengths">
              {strengths(chosen, d).map((s) => <li key={s}><span aria-hidden="true">✦</span>{s}</li>)}
            </ul>
          )}
          {d.note && <p className="dc-note">{d.note}</p>}
        </div>
        <ScoreRing value={d.route.matchScore} />
      </section>

      {d.funnel.length > 0 && (
        <Section title="משפך המועמדים" lead="כל שלב מסנן מתנדבים לפי אילוץ אחר - עד שנשאר אחד.">
          <Funnel steps={d.funnel} />
        </Section>
      )}

      {chosen && (
        <Section title={`איך נבנה הציון של ${firstName}`} lead="ארבעה רכיבים, כל אחד בין 0 ל-1, משוקללים לפי הגדרות המערכת.">
          <Breakdown c={chosen} d={d} />
        </Section>
      )}

      {d.candidates.length > 1 && (
        <Section title="מי עוד נשקל" lead="המתנדבים המובילים בדירוג (Merge Sort לפי ציון, מרחק ומזהה), ולמה לא הם.">
          <Candidates d={d} />
        </Section>
      )}

      <Section title="המסלול שנבנה" lead="Knapsack בחר מה לאסוף, ו-Held-Karp קבע את הסדר ואת שעת היציאה.">
        <RouteTimeline r={d.route} />
      </Section>

      {d.global && (
        <Section title="הבחירה הגלובלית" lead="Branch & Bound בחר בין כל המסלולים של כל התרומות בריצה - כך שבסך הכול יינצל הכי הרבה מזון.">
          <GlobalChoice g={d.global} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="dc-card dc-section">
      <header>
        <h2>{title}</h2>
        {lead && <p>{lead}</p>}
      </header>
      {children}
    </section>
  );
}

// ---------- טבעת ציון ההתאמה ----------
function ScoreRing({ value }: { value: number }) {
  const on = useMounted();
  const shown = useCountUp(Math.round(value), on, 1400);
  const r = 66;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="dc-ring" role="img" aria-label={`ציון התאמה ${Math.round(value)} מתוך 100`}>
      <svg viewBox="0 0 160 160" width="168" height="168" aria-hidden="true">
        <circle cx="80" cy="80" r={r} className="dc-ring-track" />
        <circle
          cx="80" cy="80" r={r}
          className="dc-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={on ? offset : circumference}
        />
      </svg>
      <div className="dc-ring-label">
        <b>{shown}</b>
        <span>ציון התאמה</span>
      </div>
    </div>
  );
}

// ---------- משפך ----------
function Funnel({ steps }: { steps: DecisionFunnelStepDto[] }) {
  const on = useMounted();
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <ol className="dc-funnel">
      {steps.map((s, i) => {
        const dropped = i > 0 ? steps[i - 1].count - s.count : 0;
        const last = i === steps.length - 1;
        const width = Math.max(4, (s.count / max) * 100);
        return (
          <li key={i} className={last ? 'is-last' : undefined} style={{ '--i': i } as CSSProperties}>
            <div className="dc-funnel-head">
              <span className="dc-funnel-label">{s.label}</span>
              <span className="dc-algo">{s.algorithm}</span>
              {dropped > 0 && <span className="dc-drop">סוננו {dropped}</span>}
            </div>
            <div className="dc-funnel-track">
              <div className="dc-funnel-bar" style={{ width: on ? `${width}%` : 0 }}>
                <b>{s.count}</b>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- פירוק הציון ----------
function StackedBar({ score, weights, height = 14, animate = true }: { score: DecisionScoreDto; weights: DecisionWeightsDto; height?: number; animate?: boolean }) {
  const on = useMounted();
  const parts = contributions(score, weights);
  return (
    <div className="dc-stack" style={{ height }} aria-hidden="true">
      {parts.map((p) => (
        <span key={p.key} style={{ width: animate && !on ? 0 : `${p.points}%`, background: p.color }} />
      ))}
    </div>
  );
}

function Breakdown({ c, d }: { c: DecisionCandidateDto; d: RouteDecisionDto }) {
  const parts = contributions(c.score, d.weights);
  const total = Math.round(c.score.total * 100);
  return (
    <>
      <div className="dc-total">
        <div className="dc-total-num"><b>{total}</b><span>/100</span></div>
        <div className="dc-total-bar">
          <StackedBar score={c.score} weights={d.weights} height={18} />
          <div className="dc-legend">
            {parts.map((p) => (
              <span key={p.key}><i style={{ background: p.color }} />{p.label} +{Math.round(p.points)}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="dc-components">
        {parts.map((p) => (
          <div key={p.key} className="dc-comp" style={{ '--c': p.color } as CSSProperties}>
            <div className="dc-comp-top">
              <span className="dc-comp-dot" />
              <span className="dc-comp-label">{p.label}</span>
              <span className="dc-comp-weight">משקל {Math.round(p.weight * 100)}%</span>
            </div>
            <div className="dc-comp-value">{Math.round(p.value * 100)}<small>%</small></div>
            <div className="dc-comp-meter"><span style={{ width: `${p.value * 100}%` }} /></div>
            <p className="dc-comp-hint">{p.hint(c, d)}</p>
            <p className="dc-comp-points">תרם {fmt(p.points)} נקודות</p>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- המועמדים ----------
function Candidates({ d }: { d: RouteDecisionDto }) {
  const rows = [...d.candidates].sort((a, b) => a.rank - b.rank);
  return (
    <ul className="dc-cands">
      {rows.map((c) => {
        const o = OUTCOMES[c.outcome] ?? { label: c.outcome, tone: 'muted' };
        return (
          <li key={c.volunteerId} className={`dc-cand${c.outcome === 'Chosen' ? ' is-chosen' : ''}`}>
            <span className="dc-rank">{c.rank}</span>
            <div className="dc-cand-main">
              <div className="dc-cand-line">
                <b className="dc-cand-name">{c.name}</b>
                <span className="dc-cand-km">{fmt(c.distanceKm)} ק"מ</span>
                <span className={`dc-chip tone-${o.tone}`}>{o.label}</span>
              </div>
              {c.reason && <p className="dc-cand-reason">{c.reason}</p>}
            </div>
            <div className="dc-cand-score">
              <StackedBar score={c.score} weights={d.weights} height={10} />
              <span>{Math.round(c.score.total * 100)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- המסלול ----------
function RouteTimeline({ r }: { r: DecisionRouteDto }) {
  return (
    <>
      <ol className="dc-timeline">
        <li className="dc-node is-start">
          <span className="dc-dot" />
          <b>יציאה</b>
          <span>{hhmm(r.departure)}</span>
        </li>
        {r.stops.map((s) => (
          <li key={s.donationId} className={`dc-node${s.isAnchor ? ' is-anchor' : ''}`}>
            <span className="dc-dot" />
            <b>תרומה #{s.donationId}</b>
            <span>{s.supplierName ?? 'ספק'} · {fmt(s.weightKg)} ק"ג</span>
            <span>{hhmm(s.estimatedArrival)}</span>
            {!s.isAnchor && <em>נוספה בדרך</em>}
          </li>
        ))}
        <li className="dc-node is-end">
          <span className="dc-dot" />
          <b>{r.ngoName ?? 'העמותה'}</b>
          <span>{hhmm(r.ngoArrival)}</span>
        </li>
      </ol>

      <div className="dc-stats">
        <Stat label="מרחק" value={`${fmt(r.distanceKm)} ק"מ`} />
        <Stat label="משך" value={`${Math.round(r.durationMinutes)} דק'`} />
        <Stat label="משקל" value={`${fmt(r.weightKg)} ק"ג`} />
        <Stat label="ערך Knapsack" value={fmt(r.knapsackValue)} badge={r.knapsackOptimal ? 'אופטימלי' : undefined} />
      </div>
      <p className="dc-foot">
        נבדקו {r.ngosConsidered} עמותות שיכולות לקבל את התרומה
        {r.extraDonationsConsidered > 0 ? ` ו-${r.extraDonationsConsidered} תרומות נוספות בסביבה` : ''}.
      </p>
    </>
  );
}

function Stat({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="dc-stat">
      <span>{label}</span>
      <b>{value}</b>
      {badge && <em>✓ {badge}</em>}
    </div>
  );
}

// ---------- הבחירה הגלובלית ----------
function GlobalChoice({ g }: { g: DecisionGlobalDto }) {
  const on = useMounted();
  const top = Math.max(g.upperBound, g.totalValue, g.greedyValue, 0.001);
  const gain = g.greedyValue > 0 ? ((g.totalValue - g.greedyValue) / g.greedyValue) * 100 : 0;
  const bars = useMemo(() => [
    { label: 'בחירה חמדנית (הדחוף קודם)', value: g.greedyValue, cls: 'is-greedy' },
    { label: 'Branch & Bound', value: g.totalValue, cls: 'is-best' },
  ], [g.greedyValue, g.totalValue]);

  return (
    <>
      <div className="dc-compare">
        {bars.map((b) => (
          <div key={b.label} className={`dc-compare-row ${b.cls}`}>
            <span className="dc-compare-label">{b.label}</span>
            <div className="dc-compare-track">
              <div className="dc-compare-bar" style={{ width: on ? `${(b.value / top) * 100}%` : 0 }} />
              <span className="dc-bound" style={{ insetInlineStart: `${(g.upperBound / top) * 100}%` }} title="חסם עליון" />
            </div>
            <b>{fmt(b.value)}</b>
          </div>
        ))}
      </div>
      <div className="dc-pills">
        <span className={`dc-pill ${g.provedOptimal ? 'is-teal' : 'is-amber'}`}>
          {g.provedOptimal ? '✓ הוכח אופטימלי' : `לכל היותר ${fmt(g.gapPercent)}% מהאופטימום`}
        </span>
        {gain > 0.05 && <span className="dc-pill is-teal">+{fmt(gain)}% לעומת חמדני</span>}
      </div>
      <div className="dc-stats">
        <Stat label="תרומות בריצה" value={String(g.donationsInRun)} />
        <Stat label="מסלולים מועמדים" value={String(g.candidateRoutes)} />
        <Stat label="מסלולים שנבחרו" value={String(g.routesSelected)} />
        <Stat label="צמתים בעץ החיפוש" value={g.nodes.toLocaleString('he-IL')} />
      </div>
    </>
  );
}
