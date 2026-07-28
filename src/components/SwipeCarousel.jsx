'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * SwipeCarousel — Carrusel CSS scroll-snap para ejercicios paso a paso.
 *
 * Props:
 * - slides: Array de objetos { id, type, content }
 *   - type puede ser: 'contexto' | 'paso' | 'interpretacion' | 'feedback'
 *   - content: ReactNode o string con el contenido del slide
 * - onSlideChange: (index) => void — callback cuando cambia el slide activo
 * - className: string — clases CSS adicionales para el contenedor
 *
 * Funcionalidades:
 * - Navegación nativa por swipe (CSS scroll-snap)
 * - Indicadores de puntos (dots) con posición actual
 * - Botón flotante "Saltar a interpretación" (FR-6)
 * - Mobile-first, accesible para discalculia (NFR-2)
 */
export default function SwipeCarousel({ slides = [], onSlideChange, className = '' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Encuentra el índice del slide de interpretación
  const interpretationIndex = slides.findIndex((s) => s.type === 'interpretacion');

  // Maneja el scroll y detecta el slide activo
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

  // Scrollea programáticamente a un slide específico
  const scrollToSlide = useCallback((index) => {
    const container = containerRef.current;
    if (!container) return;

    const slideWidth = container.offsetWidth;
    container.scrollTo({
      left: slideWidth * index,
      behavior: 'smooth',
    });
  }, []);

  // Saltar a interpretación (FR-6)
  const handleSkipToInterpretation = useCallback(() => {
    if (interpretationIndex >= 0) {
      scrollToSlide(interpretationIndex);
    }
  }, [interpretationIndex, scrollToSlide]);

  // Listener de scroll con throttle simple
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

  // Mostrar botón "Saltar a interpretación" solo si hay slide de interpretación
  // y el usuario aún no ha llegado a él
  const showSkipButton = interpretationIndex > 0 && activeIndex < interpretationIndex;

  return (
    <div className={`relative flex flex-col w-full ${className}`} role="region" aria-label="Ejercicio paso a paso" aria-roledescription="carrusel">
      {/* Contenedor de slides con scroll-snap */}
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 h-full flex flex-col gap-4">
              {/* Etiqueta del tipo de slide */}
              <span className={`text-base font-medium px-3 py-1.5 rounded-full w-fit ${getTagStyles(slide.type)}`}>
                {getLabelForType(slide.type)}
              </span>

              {/* Contenido del slide */}
              <div className="flex-1 text-base leading-[1.6] text-gray-800 break-words">
                {slide.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores de puntos */}
      <div className="flex justify-center items-center gap-1 py-3" role="tablist" aria-label="Indicadores de slide">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Ir a slide ${index + 1}: ${getLabelForType(slides[index]?.type)}`}
          >
            <span
              className={`block rounded-full transition-all duration-200 ${
                index === activeIndex
                  ? 'w-6 h-3 bg-primary-600'
                  : 'w-3 h-3 bg-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Botón flotante: Saltar a interpretación (FR-6) */}
      {showSkipButton && (
        <button
          onClick={handleSkipToInterpretation}
          className="fixed bottom-28 right-4 bg-accent-600 hover:bg-accent-700 text-white font-medium text-base px-5 py-3 rounded-2xl shadow-lg z-40 transition-colors duration-200 min-h-[44px]"
          aria-label="Saltar directamente a la pregunta de interpretación"
        >
          Saltar a interpretación
        </button>
      )}
    </div>
  );
}

/**
 * Devuelve la etiqueta legible para el tipo de slide.
 */
function getLabelForType(type) {
  switch (type) {
    case 'contexto':
      return 'Contexto';
    case 'paso':
      return 'Paso de cálculo';
    case 'interpretacion':
      return 'Interpretación';
    case 'feedback':
      return 'Feedback';
    default:
      return 'Slide';
  }
}

/**
 * Devuelve las clases de estilo para la etiqueta según el tipo.
 * Colores suaves para discalculia (NFR-2).
 */
function getTagStyles(type) {
  switch (type) {
    case 'contexto':
      return 'bg-primary-100 text-primary-700';
    case 'paso':
      return 'bg-gray-100 text-gray-700';
    case 'interpretacion':
      return 'bg-accent-100 text-accent-700';
    case 'feedback':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
