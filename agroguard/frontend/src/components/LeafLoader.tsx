type LeafLoaderProps = {
  label?: string;
  variant?: 'inline' | 'panel' | 'fullscreen';
};

const LeafLoader = ({ label = 'Loading...', variant = 'inline' }: LeafLoaderProps) => {
  return (
    <div className={`leaf-loader leaf-loader--${variant}`} role="status" aria-live="polite">
      <div className="corners" aria-hidden>
        <div className="corner corner--1" />
        <div className="corner corner--2" />
        <div className="corner corner--3" />
        <div className="corner corner--4" />
      </div>
      <p className="leaf-loader__label">{label}</p>
    </div>
  );
};

export default LeafLoader;
