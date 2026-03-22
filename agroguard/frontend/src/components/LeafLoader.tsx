import { useTranslation } from 'react-i18next';

type LeafLoaderProps = {
  label?: string;
  variant?: 'inline' | 'panel' | 'fullscreen';
};

const LeafLoader = ({ label, variant = 'inline' }: LeafLoaderProps) => {
  const { t } = useTranslation();
  const resolvedLabel = label || t('common.loading');

  return (
    <div className={`leaf-loader leaf-loader--${variant}`} role="status" aria-live="polite">
      <div className="corners" aria-hidden>
        <div className="corner corner--1" />
        <div className="corner corner--2" />
        <div className="corner corner--3" />
        <div className="corner corner--4" />
      </div>
      <p className="leaf-loader__label">{resolvedLabel}</p>
    </div>
  );
};

export default LeafLoader;
