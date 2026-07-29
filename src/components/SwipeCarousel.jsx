'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { formatMarkdown } from '@/lib/formatMarkdown';

export default function SwipeCarousel({ slides = [], onSlideChange, className = '' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  const interpretationIndex = slides.findIndex((s) => s.type === 'interpretacion');

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const slideWidth = container.offsetWidth;
    const newIndex = Math.round(scrollLeft / slideWidth);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < slides.length) {
      setActiveIndex(newIndex);
      onSlideChange?.(newIndex);
    }
  }, [activeIndex, slides.length, onSlideChange]);

  const scrollToSlide = useCallback((index) => {
    const container = containerRef.current;
    if (!container) return;

    const slideWidth = container.offsetWidth;
    container.scrollTo({
      left: slideWidth * index,
      behavior: 'smooth',
    });
  }, []);

  const handleSkipToInterpretation = useCallback(() => {
    if (interpretationIndex >= 0) {
      scrollToSlide(interpretationIndex);
    }
  }, [interpretationIndex, scrollToSlide]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  if (!slides.length) return null;

  const showSkipButton = interpretationIndex > 0 && activeIndex < interpretationIndex;

  return (
    <div className={`relative flex flex-col w-full ${className}`} role="region" aria-label="Ejercicio paso a paso" aria-roledescription="carrusel">
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
        aria-live="polite"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id || index}
            className="snap-center flex-shrink-0 w-full min-h-[280px] px-3 py-4 sm:px-5 sm:py-5"
            role="listitem"
            aria-label={`Slide ${index + 1} de ${slides.length}: ${getLabelForType(slide.type)}`}
            aria-hidden={index !== activeIndex}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 h-full flex flex-col gap-4">
              <span className={`text-base font-medium px-3 py-1.5 rounded-full w-fit ${getTagStyles(slide.type)}`}>
                {getLabelForType(slide.type)}
              </span>

              <div className="flex-1 text-base leading-[1.6] text-gray-800 dark:text-gray-200 break-words whitespace-pre-wrap">
                {typeof slide.content === 'string' ? (
                  <span dangerouslySetInnerHTML={{ __html: formatMarkdown(slide.content) }} />
                ) : (
                  slide.content
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-1 py-3" role="tablist" aria-label="Indicadores de slide">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className="min-h-touch min-w-touch flex items-center justify-center"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Ir a slide ${index + 1}: ${getLabelForType(slides[index]?.type)}`}
          >
            <span
              className={`block rounded-full transition-all duration-200 ${
                index === activeIndex
                  ? 'w-6 h-3 bg-primary-600 dark:bg-primary-400'
                  : 'w-3 h-3 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Skip button */}
      {showSkipButton && (
        <button
          onClick={handleSkipToInterpretation}
          className="fixed bottom-28 right-4 bg-accent-600 hover:bg-accent-700 text-white font-medium text-base px-5 py-3 rounded-2xl shadow-lg z-40 transition-colors duration-200 min-h-touch"
          aria-label="Saltar directamente a la pregunta de interpretación"
        >
          Saltar a interpretación
        </button>
      )}
    </div>
  );
}

function getLabelForType(type) {
  switch (type) {
    case 'contexto': return 'Contexto';
    case 'paso': return 'Paso de cálculo';
    case 'interpretacion': return 'Interpretación';
    case 'feedback': return 'Feedback';
    default: return 'Slide';
  }
}

function getTagStyles(type) {
  switch (type) {
    case 'contexto': return 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300';
    case 'paso': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    case 'interpretacion': return 'bg-accent-50 dark:bg-accent-900/40 text-accent-900 dark:text-accent-300';
    case 'feedback': return 'bg-accent-50 dark:bg-accent-900/40 text-accent-800 dark:text-accent-300';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}
