import type { RecommendationResponse } from "../services/api";
import { formatPercent, titleCase } from "../utils/format";

interface DecisionDetailsProps {
  recommendation: RecommendationResponse;
}

export default function DecisionDetails({ recommendation }: DecisionDetailsProps) {
  const analysis = recommendation.analysis;
  const indicators = analysis?.indicators ?? [];
  const keySignals = analysis?.keySignals ?? [];
  const risk = analysis?.riskLevel ?? "unknown";
  const profitConfidence = analysis?.profitConfidence ?? 0;
  const shouldFishToday = analysis?.shouldFishToday ?? recommendation.verdict === "GO";
  const fuelCost = analysis?.estimatedFuelCostRm;

  return (
    <div className="details-area">
      <div className="dashboard-grid">
        <article className="feature-card">
          <div className="card-topline">
            <span className="icon-chip">☀</span>
            <span>Recommendation</span>
          </div>
          <h3>{shouldFishToday ? "Reasonable fishing day" : "Skip the trip today"}</h3>
          <p>{analysis?.reasoning ?? recommendation.reason ?? "Recommendation details are unavailable."}</p>
          <div className="profit-strip">
            <span>Profit confidence</span>
            <strong className={profitConfidence >= 0.65 ? "good" : "neutral"}>
              {formatPercent(analysis?.profitConfidence)}
            </strong>
            <span>Fuel cost</span>
            <strong className={fuelCost == null ? "warn" : "neutral"}>
              {fuelCost == null ? "Unavailable" : `RM${fuelCost.toFixed(2)}`}
            </strong>
          </div>
        </article>

        <article className="feature-card" id="market">
          <div className="card-topline">
            <span className="icon-chip">RM</span>
            <span>Key Signals</span>
          </div>
          <h3>Risk is {risk.toLowerCase()}</h3>
          <div className="signal-list">
            {keySignals.length === 0 ? (
              <div className="signal-row">
                <span aria-hidden="true">!</span>
                <p>No key signals were returned.</p>
              </div>
            ) : (
              keySignals.map((signal) => (
                <div className="signal-row" key={signal}>
                  <span aria-hidden="true">✓</span>
                  <p>{signal}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="feature-card log-card" id="insights">
          <div className="card-topline">
            <span className="icon-chip">✎</span>
            <span>Signal Scores</span>
          </div>
          <h3>Indicator detail</h3>
          <div className="indicator-table">
            {indicators.length === 0 ? (
              <div className="indicator-row">
                <span>Signals</span>
                <strong>N/A</strong>
                <em>Unknown</em>
              </div>
            ) : (
              indicators.map((item, index) => (
                <div className="indicator-row" key={item.indicator ?? index}>
                  <span>{titleCase(item.indicator)}</span>
                  <strong>{formatPercent(item.score)}</strong>
                  <em>{titleCase(item.riskLevel)}</em>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="insight-list">
        {indicators.length === 0 ? (
          <div className="insight-item">
            <span aria-hidden="true">!</span>
            <p>{recommendation.errorDetail ?? "No indicator detail was returned."}</p>
          </div>
        ) : (
          indicators.map((indicator, index) => (
            <div className="insight-item" key={indicator.indicator ?? index}>
              <span aria-hidden="true">✓</span>
              <p>
                <strong>{titleCase(indicator.indicator)}:</strong>{" "}
                {indicator.summary ?? "No summary returned."} Confidence {formatPercent(indicator.confidence)}.
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
