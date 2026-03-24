import { useEffect, useRef, useState } from 'react';

type SlideItem = {
  src: string;
  caption: string;
};

type FarmSlideshowProps = {
  slides: SlideItem[];
  title: string;
  prevLabel: string;
  nextLabel: string;
  dotLabel: string;
  autoAdvanceMs?: number;
  className?: string;
};

const SWIPE_THRESHOLD_PX = 40;

const FarmSlideshow = ({
  slides,
  title,
  prevLabel,
  nextLabel,
  dotLabel,
  autoAdvanceMs = 4000,
  className,
}: FarmSlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoAdvanceMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoAdvanceMs, isPaused, slides.length]);

  useEffect(() => {
    if (currentIndex < slides.length) return;
    setCurrentIndex(0);
  }, [currentIndex, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = touchEndX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX > 0) {
      goToPrev();
      return;
    }

    goToNext();
  };

  if (!slides.length) return null;

  return (
    <section className={`farm-slideshow ${className || ''}`.trim()} aria-label={title}>
      <div
        className="farm-slideshow__viewport"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((slide, index) => {
          const active = index === currentIndex;

          return (
            <article
              key={`${slide.src}-${index}`}
              className={`farm-slideshow__slide ${active ? 'is-active' : ''}`}
              aria-hidden={!active}
            >
              <img src={slide.src} alt={slide.caption} loading={index === 0 ? 'eager' : 'lazy'} />
              <div className="farm-slideshow__overlay">
                <span>{slide.caption}</span>
              </div>
            </article>
          );
        })}

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              className="farm-slideshow__arrow farm-slideshow__arrow--left"
              aria-label={prevLabel}
              onClick={goToPrev}
            >
              {'<'}
            </button>
            <button
              type="button"
              className="farm-slideshow__arrow farm-slideshow__arrow--right"
              aria-label={nextLabel}
              onClick={goToNext}
            >
              {'>'}
            </button>
          </>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="farm-slideshow__dots" role="tablist" aria-label={dotLabel}>
          {slides.map((slide, index) => (
            <button
              key={`${slide.caption}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`${dotLabel} ${index + 1}`}
              className={`farm-slideshow__dot ${index === currentIndex ? 'is-active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default FarmSlideshow;
