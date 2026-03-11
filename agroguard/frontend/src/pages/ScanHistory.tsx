import { useEffect, useState } from 'react';
import api from '../lib/api';
import LeafLoader from '../components/LeafLoader';

type HistoryItem = {
  id: string;
  disease_name: string;
  confidence: number;
  image_url: string;
  timestamp: string;
  analysis_json?: {
    cause?: string;
    treatment?: string;
  };
};

const ScanHistory = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get('/scans')
      .then((res) => {
        setItems(res.data.items || []);
        setError('');
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Unable to fetch scan history.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card">
        <LeafLoader variant="panel" label="Loading scan history" />
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const searchHit = item.disease_name.toLowerCase().includes(query.trim().toLowerCase());
    const confidenceHit = item.confidence * 100 >= minConfidence;
    return searchHit && confidenceHit;
  });

  const averageConfidence = filteredItems.length
    ? filteredItems.reduce((acc, item) => acc + item.confidence, 0) / filteredItems.length
    : 0;

  return (
    <div className="history-layout">
      <section className="card history-hero">
        <div className="section-title-row">
          <div>
            <p className="subtitle">Traceability Log</p>
            <h1 className="headline">Plant Disease Scan History</h1>
            <p className="lead">View all previous plant disease analyses, including detection results, confidence scores, and recommended treatments.</p>
          </div>
          <span className="pill">{filteredItems.length} scans</span>
        </div>
      </section>

      <section className="card history-controls">
        <div className="history-controls__row">
          <div className="history-control">
            <label className="field-label" htmlFor="history-search">Search Disease</label>
            <input
              id="history-search"
              className="input"
              placeholder="e.g. tomato_late_blight"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="history-control">
            <label className="field-label" htmlFor="history-confidence">Minimum Confidence: {minConfidence}%</label>
            <input
              id="history-confidence"
              className="slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={minConfidence}
              onChange={(event) => setMinConfidence(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="pill-row">
          <span className="pill">Average confidence: {(averageConfidence * 100).toFixed(2)}%</span>
          <span className="pill">Total records loaded: {items.length}</span>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {filteredItems.length === 0 ? (
        <div className="card empty-state-card">
          <h3>No scans recorded yet</h3>
          <p>Run your first leaf analysis or relax filters to populate this timeline.</p>
        </div>
      ) : (
        <div className="history-timeline">
          {filteredItems.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card__header">
                <strong>{item.disease_name.replaceAll('_', ' ')}</strong>
                <span className="pill">{(item.confidence * 100).toFixed(1)}%</span>
              </div>

              <div className="label-muted">Captured: {new Date(item.timestamp).toLocaleString()}</div>
              <a href={item.image_url} target="_blank" rel="noreferrer" className="history-link">
                View image
              </a>

              {item.analysis_json?.cause && (
                <div className="label-muted">Cause: {item.analysis_json.cause}</div>
              )}

              {item.analysis_json?.treatment && (
                <div className="label-muted">Treatment: {item.analysis_json.treatment}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanHistory;
