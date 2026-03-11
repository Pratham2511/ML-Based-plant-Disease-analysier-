import { useForm } from 'react-hook-form';
import { useState } from 'react';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';

type ProfileForm = { email: string; otp?: string; latitude?: number; longitude?: number };

const Profile = () => {
  const { user } = useAuth();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState(false);
  const form = useForm<ProfileForm>({
    defaultValues: {
      email: user?.email || '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  const watchedLatitude = form.watch('latitude');
  const watchedLongitude = form.watch('longitude');
  const locationCompleteness =
    watchedLatitude !== undefined && watchedLatitude !== null && watchedLongitude !== undefined && watchedLongitude !== null
      ? 100
      : watchedLatitude !== undefined || watchedLongitude !== undefined
        ? 50
        : 0;

  const requestOtp = async () => {
    setErrorMessage('');
    setStatusMessage('');
    setPending(true);
    try {
      await api.post('/auth/change-email-request', { email: form.getValues('email') });
      setStatusMessage('OTP sent to your new email address.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Unable to send OTP');
    } finally {
      setPending(false);
    }
  };

  const submit = async (data: ProfileForm) => {
    setErrorMessage('');
    setStatusMessage('');
    setPending(true);
    try {
      await api.post('/auth/change-email-verify', { email: data.email, otp: data.otp });
      setStatusMessage('Email updated successfully.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Email update failed');
    } finally {
      setPending(false);
    }
  };

  const updateLocation = async () => {
    setErrorMessage('');
    setStatusMessage('');
    setPending(true);
    try {
      const latitude = Number(form.getValues('latitude'));
      const longitude = Number(form.getValues('longitude'));
      await api.post('/auth/location', { latitude, longitude });
      setStatusMessage('Location updated successfully.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Location update failed');
    } finally {
      setPending(false);
    }
  };

  const detectLocation = () => {
    setErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', Number(position.coords.latitude.toFixed(6)));
        form.setValue('longitude', Number(position.coords.longitude.toFixed(6)));
        setStatusMessage('GPS coordinates captured. Save location to persist.');
      },
      () => {
        setErrorMessage('Unable to detect location. Please enter coordinates manually.');
      }
    );
  };

  return (
    <div className="profile-layout">
      <section className="card profile-hero">
        <p className="subtitle">Account Settings</p>
        <h1 className="headline">Account Settings and Farm Location</h1>
        <p className="lead">Your farm location helps improve disease detection accuracy and regional crop analysis.</p>
        <div className="pill-row">
          <span className="pill">User ID: {user?.id || 'Unknown'}</span>
          <span className="pill">Account: {user?.email || 'Not available'}</span>
          <span className="pill">Location completeness: {locationCompleteness}%</span>
        </div>
      </section>

      <section className="profile-grid">
        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Email Change (OTP Protected)</h2>
              <p>Request OTP on the new email first, then verify update.</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(submit)} className="auth-form">
            <label className="field-label" htmlFor="profile-email">New Email</label>
            <input id="profile-email" className="input" placeholder="new-email@domain.com" {...form.register('email')} />

            <label className="field-label" htmlFor="profile-otp">OTP</label>
            <input id="profile-otp" className="input" placeholder="6-digit OTP" {...form.register('otp')} />

            <div className="inline-row">
              <button className="btn ghost" type="button" onClick={requestOtp} disabled={pending}>
                Send OTP
              </button>
              <button className="btn primary" type="submit" disabled={pending}>
                Update Email
              </button>
            </div>
          </form>
        </article>

        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>Farm Location</h2>
              <p>Accurate coordinates improve disease context and region-level analysis.</p>
            </div>
          </div>

          <div className="auth-form">
            <label className="field-label" htmlFor="profile-latitude">Latitude</label>
            <input id="profile-latitude" className="input" placeholder="e.g. 18.5204" type="number" step="any" {...form.register('latitude')} />

            <label className="field-label" htmlFor="profile-longitude">Longitude</label>
            <input id="profile-longitude" className="input" placeholder="e.g. 73.8567" type="number" step="any" {...form.register('longitude')} />

            <button className="btn ghost" type="button" onClick={detectLocation} disabled={pending}>
              Detect via GPS
            </button>

            <button className="btn outline" type="button" onClick={updateLocation} disabled={pending}>
              Save Location
            </button>
          </div>
        </article>
      </section>

      <section className="card profile-checklist">
        <h3>Account Settings Checklist</h3>
        <div className="checklist-grid">
          <div className="checklist-item">
            <strong>Email OTP</strong>
            <span>Enabled for login and email change workflows.</span>
          </div>
          <div className="checklist-item">
            <strong>Session Cookie</strong>
            <span>HttpOnly JWT cookie active for secure session management.</span>
          </div>
          <div className="checklist-item">
            <strong>Farm Location</strong>
            <span>Maintain accurate farm coordinates to improve disease detection and crop insights.</span>
          </div>
        </div>
      </section>

      {pending && <LeafLoader variant="panel" label="Updating profile" />}
      {statusMessage && <div className="success-box">{statusMessage}</div>}
      {errorMessage && <p className="form-error">{errorMessage}</p>}
    </div>
  );
};

export default Profile;
