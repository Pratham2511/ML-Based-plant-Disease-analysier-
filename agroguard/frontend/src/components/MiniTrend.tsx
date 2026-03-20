type MiniTrendProps = {
  points: number[];
  stroke?: string;
  height?: number;
};

const MiniTrend = ({ points, stroke = '#2e7d32', height = 74 }: MiniTrendProps) => {
  if (!points.length) {
    return <div className="mini-trend__empty">No data yet</div>;
  }

  const width = 240;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="mini-trend" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
      <polyline points={coords} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default MiniTrend;
