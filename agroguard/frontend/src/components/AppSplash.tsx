import LeafLoader from './LeafLoader';

const AppSplash = () => {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <div className="app-splash__panel">
        <img src="/app-icon.svg" alt="AgroGuard app icon" className="app-splash__icon" />
        <h1>AgroGuard</h1>
        <p>Initializing field intelligence</p>
        <LeafLoader label="Booting secure modules" variant="inline" />
      </div>
    </div>
  );
};

export default AppSplash;
