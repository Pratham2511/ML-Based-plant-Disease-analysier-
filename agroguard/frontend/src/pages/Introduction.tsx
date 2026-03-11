import { Link } from 'react-router-dom';

const Introduction = () => {
  return (
    <div className="landing-layout">
      <section className="hero-shell">
        <div className="hero-content">
          <p className="subtitle">Smart Crop Protection for Farmers</p>
          <h1 className="headline">AI-Powered Crop Disease Detection and Agro-Medicine Verification</h1>
          <p className="lead">
            AgroGuard helps farmers detect crop diseases early using AI-powered leaf analysis and verify the authenticity
            of agricultural medicines using secure batch-code verification.
          </p>
          <p className="lead">
            Upload a plant leaf image to identify diseases instantly, understand their causes, and get recommended
            treatments. Farmers can also scan medicine batch codes to ensure the products they are using are genuine
            and safe.
          </p>

          <div className="hero-actions">
            <Link className="btn primary" to="/dashboard">
              Start Disease Analysis
            </Link>
            <Link className="btn outline" to="/dashboard">
              Verify Medicine Batch
            </Link>
          </div>

          <div className="hero-chip-row">
            <span className="pill">AI Crop Disease Detection</span>
            <span className="pill">Medicine Authenticity Verification</span>
            <span className="pill">Location-Based Disease Insights</span>
            <span className="pill">Secure Farmer Login</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden>
          <div className="hero-visual__glass">
            <p>Live Monitoring</p>
            <strong>Field Risk Score: Low</strong>
            <span>Last scan confidence: 93.2%</span>
          </div>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>Why AgroGuard</h2>
          <span className="pill">Built for Farm Decisions</span>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon">01</div>
            <h3>AI Disease Detection</h3>
            <p>Upload a leaf image and instantly identify plant diseases using advanced machine learning models.</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">02</div>
            <h3>Medicine Authenticity Verification</h3>
            <p>Scan agro-medicine batch codes to verify that the products are genuine and not counterfeit.</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">03</div>
            <h3>Location-Aware Crop Insights</h3>
            <p>Your farm location helps AgroGuard provide more accurate disease analysis and recommendations.</p>
          </article>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>Who Uses AgroGuard</h2>
          <span className="pill">Practical Field Support</span>
        </div>

        <div className="impact-grid">
          <article className="impact-card">
            <strong>Farmers</strong>
            <p>Detect crop diseases early and choose treatment options quickly during daily field checks.</p>
          </article>
          <article className="impact-card">
            <strong>Agricultural Researchers</strong>
            <p>Review disease trends and confidence results to support crop health research and recommendations.</p>
          </article>
          <article className="impact-card">
            <strong>Crop Advisors</strong>
            <p>Verify medicine authenticity and guide farmers with safer, evidence-based treatment decisions.</p>
          </article>
        </div>

        <div className="closing-cta">
          <h3>Ready to protect your crops with AgroGuard?</h3>
          <div className="hero-actions">
            <Link className="btn primary" to="/dashboard">
              Start Disease Analysis
            </Link>
            <Link className="btn ghost" to="/history">
              Scan History
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Introduction;
