'use client';

import { useState } from 'react';
import { formatMarkdown } from '@/lib/formatMarkdown';
import dynamic from 'next/dynamic';

const SwipeCarousel = dynamic(() => import('@/components/SwipeCarousel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-slow-spin" />
        <p className="text-base text-gray-500">Cargando ejercicio...</p>
      </div>
    </div>
  ),
});

const TOPICS = [
  'Probabilidad',
  'Hipótesis',
  't-Student',
  'ANOVA',
  'Chi-cuadrada',
  'Correlación',
  'Regresión',
];

export default function EjerciciosPage() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Llama a la API para generar un ejercicio y transforma la respuesta en slides.
   */
  async function handleGenerateExercise() {
    if (!selectedTopic) return;

    setLoading(true);
    setError('');
    setSlides([]);

    try {
      const userId = localStorage.getItem('user_id') || '';

      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al generar el ejercicio. Intenta de nuevo.');
        return;
      }

      const exercise = data.exercise;

      // Convertir el ejercicio en slides para el SwipeCarousel
      const newSlides = [];

      // Slide 1: Contexto
      newSlides.push({
        id: 'contexto',
        type: 'contexto',
        content: exercise.contexto,
      });

      // Slides 2..N: Pasos
      exercise.pasos.forEach((paso, index) => {
        newSlides.push({
          id: `paso-${index}`,
          type: 'paso',
          content: paso,
        });
      });

      // Último slide: Interpretación con opciones
      newSlides.push({
        id: 'interpretacion',
        type: 'interpretacion',
        content: (
          <InterpretacionSlide
            pregunta={exercise.pregunta_interpretacion}
            opciones={exercise.opciones}
            respuestaCorrecta={exercise.respuesta_correcta}
            feedback={exercise.feedback}
            topic={selectedTopic}
          />
        ),
      });

      setSlides(newSlides);
    } catch (err) {
      console.error('Error generando ejercicio:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto px-3 sm:px-4 py-4 gap-5">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-primary-700 text-center">
        Ejercicios
      </h1>

      {/* Topic selector */}
      <div className="flex flex-col gap-2 px-1">
        <label
          htmlFor="topic-select"
          className="text-base font-medium text-gray-700"
        >
          Selecciona un tema
        </label>
        <select
          id="topic-select"
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="w-full min-h-touch px-4 py-3 text-base bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 appearance-none cursor-pointer"
          aria-label="Seleccionar tema de estadística"
        >
          <option value="" disabled>
            — Elige un tema —
          </option>
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      {/* Generate exercise button */}
      <div className="px-1">
        <button
          onClick={handleGenerateExercise}
          disabled={!selectedTopic || loading}
          className="w-full min-h-touch px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2"
          aria-label="Generar ejercicio del tema seleccionado"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <LoadingSpinner />
              <span>Generando...</span>
            </>
          ) : (
            'Generar ejercicio'
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mx-1 px-4 py-3 text-base bg-red-50 border border-red-200 text-red-700 rounded-2xl"
        >
          {error}
        </div>
      )}

      {/* Carousel area — full-width slides when exercises are available */}
      <div className="flex-1 min-h-0 -mx-3 sm:-mx-4">
        {slides.length > 0 ? (
          <SwipeCarousel
            slides={slides}
            onSlideChange={() => {}}
            className="h-full"
          />
        ) : (
          !loading && (
            <div className="flex items-center justify-center h-full min-h-[200px] mx-3 sm:mx-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50">
              <p className="text-base text-gray-500 text-center px-4 leading-[1.6]">
                Selecciona un tema y genera un ejercicio para comenzar
              </p>
            </div>
          )
        )}

        {/* Loading placeholder while generating */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] mx-3 sm:mx-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-base text-primary-800 text-center px-4 leading-[1.6]">
              Creando tu ejercicio de {selectedTopic}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente de spinner de carga.
 * Accesible y con tamaño configurable.
 */
function LoadingSpinner({ size = 'sm' }) {
  const sizeClasses = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <svg
      className={`animate-slow-spin ${sizeClasses} text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Componente para el slide de interpretación con opciones seleccionables.
 * Implementa radio buttons accesibles con tamaños mínimos de 44px.
 */
function InterpretacionSlide({ pregunta, opciones, respuestaCorrecta, feedback, topic }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [altExplanation, setAltExplanation] = useState('');
  const [altLoading, setAltLoading] = useState(false);

  function handleOptionSelect(index) {
    if (showFeedback) return; // No cambiar después de responder
    setSelectedOption(index);
  }

  function handleConfirm() {
    if (selectedOption === null) return;
    setShowFeedback(true);

    // Fire-and-forget: actualizar progreso en el servidor
    const isCorrect = selectedOption === respuestaCorrecta;
    const userId = localStorage.getItem('user_id') || '';
    if (userId && topic) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, topic, isCorrect }),
      }).catch((err) => console.error('Error actualizando progreso:', err));
    }
  }

  async function handleExplainDifferently() {
    if (altLoading) return;
    setAltLoading(true);
    setAltExplanation('');

    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Explícamelo de otra forma, usa una analogía diferente o un ejemplo más simple. Esta es la explicación original de un ejercicio de ${topic}: "${feedback}"`,
          userId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.response) {
        setAltExplanation(data.response);
      } else {
        setAltExplanation('No se pudo obtener una explicación alternativa. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error obteniendo explicación alternativa:', err);
      setAltExplanation('Error de conexión. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setAltLoading(false);
    }
  }

  const isCorrect = selectedOption === respuestaCorrecta;

  return (
    <div className="flex flex-col gap-5">
      {/* Pregunta */}
      <p className="text-base font-medium text-gray-800 leading-[1.6]">
        {pregunta}
      </p>

      {/* Opciones */}
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Opciones de respuesta">
        {opciones.map((opcion, index) => {
          let optionStyles = 'bg-white border-gray-200 text-gray-800';

          if (showFeedback) {
            if (index === respuestaCorrecta) {
              optionStyles = 'bg-green-50 border-green-200 text-green-800';
            } else if (index === selectedOption && !isCorrect) {
              optionStyles = 'bg-red-50 border-red-200 text-red-800';
            }
          } else if (index === selectedOption) {
            optionStyles = 'bg-primary-50 border-primary-200 text-primary-800';
          }

          return (
            <button
              key={index}
              onClick={() => handleOptionSelect(index)}
              disabled={showFeedback}
              role="radio"
              aria-checked={index === selectedOption}
              className={`w-full min-h-[48px] px-4 py-3 text-base text-left rounded-xl border-2 transition-colors duration-200 leading-[1.5] ${optionStyles} disabled:cursor-default`}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {opcion}
            </button>
          );
        })}
      </div>

      {/* Botón confirmar */}
      {!showFeedback && (
        <button
          onClick={handleConfirm}
          disabled={selectedOption === null}
          className="w-full min-h-[48px] px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed bg-accent-600 hover:bg-accent-700 text-white mt-1"
        >
          Confirmar respuesta
        </button>
      )}

      {/* Feedback */}
      {showFeedback && (
        <>
          <div
            className={`px-4 py-4 text-base rounded-xl border mt-1 ${
              isCorrect
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            role="alert"
          >
            <p className="font-medium mb-2">
              {isCorrect ? '¡Correcto!' : 'No exactamente'}
            </p>
            <p className="leading-[1.6]" dangerouslySetInnerHTML={{ __html: formatMarkdown(feedback) }} />
          </div>

          {/* Botón Explícamelo de otra forma */}
          <button
            onClick={handleExplainDifferently}
            disabled={altLoading}
            className="self-start min-h-touch px-4 py-2.5 text-base text-accent-900 bg-accent-50 hover:bg-accent-100 border border-accent-200 rounded-2xl transition-colors duration-200 disabled:opacity-60 disabled:cursor-wait"
            aria-label="Explícamelo de otra forma"
          >
            {altLoading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Generando...
              </span>
            ) : (
              '🔄 Explícamelo de otra forma'
            )}
          </button>

          {/* Explicación alternativa */}
          {altExplanation && (
            <div
              className="px-4 py-4 text-base rounded-xl border bg-accent-50 border-accent-200 text-gray-900"
              role="region"
              aria-label="Explicación alternativa"
            >
              <p className="font-medium mb-2 text-accent-900">Otra forma de verlo:</p>
              <p className="leading-[1.6] whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMarkdown(altExplanation) }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
