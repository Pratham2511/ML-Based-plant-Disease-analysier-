import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';

type Metrics = {
  active_now: number;
  active_15m: number;
  active_24h: number;
  scans_today: number;
  failed_scans_today: number;
  new_users_today: number;
  total_scans: number;
  timestamp: string;
};

type HealthStatus = {
  api: boolean;
  database: boolean;
  ml_service: boolean;
  timestamp: string;
};

type Alert = {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
};

type Activity = {
  user_id: string | null;
  action_type: string;
  details: unknown;
  ip_address: string | null;
  created_at: string;
};

type AdminUser = {
  user_id: string;
  last_seen: string;
  user_agent: string | null;
  scan_count: number;
  last_scan: string | null;
};

const EMPTY_METRICS: Metrics = {
  active_now: 0,
  active_15m: 0,
  active_24h: 0,
  scans_today: 0,
  failed_scans_today: 0,
  new_users_today: 0,
  total_scans: 0,
  timestamp: '',
};

const EMPTY_HEALTH: HealthStatus = {
  api: false,
  database: false,
  ml_service: false,
  timestamp: '',
};

const truncateId = (value: string | null | undefined) => {
  if (!value) return '-';
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const detailsToText = (details: unknown) => {
  if (!details) return '-';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return '-';
  }
};

const AdminDashboard = () => {
  const { t } = useTranslation();

  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [health, setHealth] = useState<HealthStatus>(EMPTY_HEALTH);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/metrics');
      setMetrics({ ...EMPTY_METRICS, ...(res.data || {}) });
    } catch {
      // Keep previous data on transient failures.
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await api.get('/admin/health');
      setHealth({ ...EMPTY_HEALTH, ...(res.data || {}) });
    } catch {
      // Keep previous data on transient failures.
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchPanels = async () => {
    try {
      const [alertsRes, activityRes, usersRes] = await Promise.all([
        api.get('/admin/alerts'),
        api.get('/admin/activity', { params: { limit: 50 } }),
        api.get('/admin/users', { params: { limit: 50 } }),
      ]);

      setAlerts(Array.isArray(alertsRes.data?.alerts) ? alertsRes.data.alerts : []);
      setActivities(Array.isArray(activityRes.data?.activities) ? activityRes.data.activities : []);
      setUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
    } catch {
      // Keep previous data on transient failures.
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchHealth();
    fetchPanels();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(fetchMetrics, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(fetchHealth, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(fetchPanels, 45000);
    return () => window.clearInterval(interval);
  }, []);

  const markAlertRead = async (id: string) => {
    try {
      await api.post(`/admin/alerts/${id}/read`);
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, is_read: true } : alert)));
    } catch {
      // Ignore and let next refresh synchronize state.
    }
  };

  const cards = useMemo(
    () => [
      { label: t('admin.activeNow'), value: metrics.active_now, color: 'green' },
      { label: t('admin.active15m'), value: metrics.active_15m, color: 'teal' },
      { label: t('admin.active24h'), value: metrics.active_24h, color: 'blue' },
      { label: t('admin.scansToday'), value: metrics.scans_today, color: 'purple' },
      { label: t('admin.failedScans'), value: metrics.failed_scans_today, color: 'red' },
      { label: t('admin.newUsers'), value: metrics.new_users_today, color: 'amber' },
    ],
    [metrics, t]
  );

  const unreadCount = alerts.filter((item) => !item.is_read).length;

  return (
    <section className="admin-dashboard">
      <header className="card admin-header">
        <div>
          <p className="subtitle">Control Center</p>
          <h1 className="headline">{t('admin.title')}</h1>
        </div>
        <div className="pill">
          Total scans: <strong>{metrics.total_scans}</strong>
        </div>
      </header>

      <section className="admin-section admin-metrics-grid" aria-label="admin-live-metrics">
        {cards.map((card) => (
          <article key={card.label} className={`card admin-metric-card admin-metric-card--${card.color}`}>
            <p className="admin-metric-label">{card.label}</p>
            <p className="admin-metric-value">{loadingMetrics ? '-' : card.value}</p>
          </article>
        ))}
      </section>

      <section className="card admin-section">
        <div className="section-title-row">
          <h2>{t('admin.systemHealth')}</h2>
          <span className="label-muted">{loadingHealth ? t('common.loading') : formatDate(health.timestamp)}</span>
        </div>
        <div className="admin-health-row">
          <span className={`admin-health-pill ${health.api ? 'ok' : 'down'}`}>
            API: {health.api ? t('admin.operational') : t('admin.down')}
          </span>
          <span className={`admin-health-pill ${health.database ? 'ok' : 'down'}`}>
            Database: {health.database ? t('admin.operational') : t('admin.down')}
          </span>
          <span className={`admin-health-pill ${health.ml_service ? 'ok' : 'down'}`}>
            ML Service: {health.ml_service ? t('admin.operational') : t('admin.down')}
          </span>
        </div>
      </section>

      <section className="card admin-section">
        <div className="section-title-row">
          <h2>{t('admin.alerts')}</h2>
          <span className={`pill ${unreadCount > 0 ? 'admin-unread-pill' : ''}`}>{unreadCount} unread</span>
        </div>

        {alerts.length === 0 && !loadingLists ? <p className="lead">{t('admin.noAlerts')}</p> : null}

        <div className="admin-alerts-list">
          {alerts.map((alert) => (
            <article key={alert.id} className={`admin-alert-item ${alert.is_read ? 'is-read' : 'is-unread'}`}>
              <div>
                <p className="admin-alert-title">{alert.alert_type}</p>
                <p className="admin-alert-message">{alert.message}</p>
                <p className="label-muted">{formatDate(alert.created_at)}</p>
              </div>
              <div className="admin-alert-actions">
                <span className={`admin-severity admin-severity--${alert.severity}`}>{alert.severity}</span>
                {!alert.is_read ? (
                  <button type="button" className="btn outline btn--compact" onClick={() => markAlertRead(alert.id)}>
                    {t('admin.markRead')}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-two-column">
        <article className="card admin-section">
          <div className="section-title-row">
            <h2>{t('admin.activityFeed')}</h2>
            <span className="label-muted">{activities.length} records</span>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((row, index) => (
                  <tr key={`${row.action_type}-${row.created_at}-${index}`}>
                    <td>{truncateId(row.user_id)}</td>
                    <td>{row.action_type}</td>
                    <td>{detailsToText(row.details)}</td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card admin-section">
          <div className="section-title-row">
            <h2>{t('admin.userList')}</h2>
            <span className="label-muted">{users.length} users</span>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Last seen</th>
                  <th>Scans</th>
                  <th>Last scan</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.user_id}>
                    <td>{truncateId(row.user_id)}</td>
                    <td>{formatDate(row.last_seen)}</td>
                    <td>{row.scan_count}</td>
                    <td>{formatDate(row.last_scan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </section>
  );
};

export default AdminDashboard;
