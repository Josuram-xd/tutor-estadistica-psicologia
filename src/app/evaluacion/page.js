'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TOPICS = [
  'Probabilidad',
  'Hipótesis',
  't-Student',
  'ANOVA',
  'Chi-cuadrada',
  'Correlación',
  'Regresión',
];

export default function EvaluacionPage() {
  const router = useRouter();

  // State management
  const [selectedTopic, setSelectedTopic] = useState('');
  const [phase, setPhase] = useState('select'); // 'select' | 'loading' | 'quiz' | 'summary'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState('');
  const [altExplanation, setAltExplanation] = useState('');
  const [altLoading, setAltLoading] = useState(false);

  /**
   * Inicia la evaluación llamando a POST /api/eval
   */
  async function handleStartEval() {
    if (!selectedTopic) return;

    setPhase('loading');
    setError('');
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);

    try {
      const userId = localStorage.getItem('user_id') || '';

      const response = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al generar la evaluación. Intenta de nuevo.');
        setPhase('select');
        return;
      }

      setQuestions(data.preguntas);
      setPhase('quiz');
    } catch (err) {
      console.error('Error generando evaluación:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión.');
      setPhase('select');
    }
  }

  /**
   * Maneja la selección de una opción de respuesta.
   */
  function handleOptionSelect(index) {
    if (showFeedback) return;
    setSelectedOption(index);
  }

  /**
   * Confirma la respuesta seleccionada y muestra feedback.
   */
  function handleConfirmAnswer() {
    if (selectedOption === null) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOption === currentQuestion.respuesta_correcta;

    // Guardar respuesta
    const newAnswer = {
      selected: selectedOption,
      correct: currentQuestion.respuesta_correcta,
      isCorrect,
    };
    setAnswers((prev) => [...prev, newAnswer]);
    setShowFeedback(true);
  }

  /**
   * Avanza a la siguiente pregunta o al resumen final.
   * Cuando es la última pregunta, envía actualización de progreso consolidada a Supabase.
   */
  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setAltExplanation('');
      setAltLoading(false);
    } else {
      // Última pregunta: transicionar a resumen y enviar progreso consolidado
      setPhase('summary');

      // Calcular totales de la evaluación (answers ya incluye la última respuesta)
      const allAnswers = [...answers]; // answers ya tiene la respuesta actual (se setea en handleConfirmAnswer)
      const totalExercises = allAnswers.length;
      const totalCorrect = allAnswers.filter((a) => a.isCorrect).length;

      // Enviar actualización consolidada al finalizar la evaluación
      const userId = localStorage.getItem('user_id') || '';
      if (userId && selectedTopic && totalExercises > 0) {
        fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            topic: selectedTopic,
            exercisesCompleted: totalExercises,
            correctAnswers: totalCorrect,
          }),
        }).catch((err) => console.error('Error actualizando progreso final:', err));
      }
    }
  }

  /**
   * Solicita una explicación alternativa del feedback actual vía /api/chat.
   */
  async function handleExplainDifferently() {
    if (altLoading) return;
    setAltLoading(true);
    setAltExplanation('');

    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      const currentExplanation = questions[currentIndex]?.explicacion || '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Explícamelo de otra forma, usa una analogía diferente o un ejemplo más simple. Esta es la explicación original de una pregunta de evaluación de ${selectedTopic}: "${currentExplanation}"`,
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

  /**
   * Reinicia la evaluación para volver a intentar.
   */
  function handleRestart() {
    setPhase('select');
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setError('');
    setAltExplanation('');
    setAltLoading(false);
  }

  // Calcular puntaje para el resumen
  const score = answers.filter((a) => a.isCorrect).length;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto px-3 sm:px-4 py-4 gap-5">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-primary-700 text-center">
        Evaluación
      </h1>

      {/* ===== FASE: SELECCIÓN DE TEMA ===== */}
      {phase === 'select' && (
        <>
          {/* Topic selector */}
          <div className="flex flex-col gap-2 px-1">
            <label
              htmlFor="eval-topic-select"
              className="text-base font-medium text-gray-700"
            >
              Selecciona un tema para la prueba
            </label>
            <select
              id="eval-topic-select"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full min-h-touch px-4 py-3 text-base bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 appearance-none cursor-pointer"
              aria-label="Seleccionar tema para evaluación"
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

          {/* Start evaluation button */}
          <div className="px-1">
            <button
              onClick={handleStartEval}
              disabled={!selectedTopic}
              className="w-full min-h-touch px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2"
              aria-label="Empezar prueba del tema seleccionado"
            >
              Empezar prueba
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

          {/* Placeholder */}
          <div className="flex-1 flex items-center justify-center min-h-[200px] mx-1 rounded-2xl border border-dashed border-gray-200 bg-gray-50">
            <p className="text-base text-gray-500 text-center px-4 leading-[1.6]">
              La prueba tiene 5 preguntas de opción múltiple con feedback inmediato
            </p>
          </div>
        </>
      )}

      {/* ===== FASE: CARGANDO ===== */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] mx-1 rounded-2xl border border-dashed border-primary-200 bg-primary-50 gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-base text-primary-800 text-center px-4 leading-[1.6]">
            Generando tu prueba de {selectedTopic}...
          </p>
        </div>
      )}

      {/* ===== FASE: QUIZ (PREGUNTAS) ===== */}
      {phase === 'quiz' && questions.length > 0 && (
        <div className="flex flex-col gap-5 flex-1 px-1">
          {/* Progress indicator */}
          <div className="flex items-center justify-between" aria-live="polite">
            <span className="text-base font-medium text-gray-600">
              Pregunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-base text-gray-500">
              {answers.filter((a) => a.isCorrect).length} correcta{answers.filter((a) => a.isCorrect).length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Progreso: pregunta ${currentIndex + 1} de ${questions.length}`}
          >
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question text */}
          <p className="text-base font-medium text-gray-800 leading-[1.6]">
            {questions[currentIndex].pregunta}
          </p>

          {/* Options */}
          <div
            className="flex flex-col gap-3"
            role="radiogroup"
            aria-label="Opciones de respuesta"
          >
            {questions[currentIndex].opciones.map((opcion, index) => {
              let optionStyles = 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50';

              if (showFeedback) {
                if (index === questions[currentIndex].respuesta_correcta) {
                  optionStyles = 'bg-green-50 border-green-200 text-green-800';
                } else if (index === selectedOption && selectedOption !== questions[currentIndex].respuesta_correcta) {
                  optionStyles = 'bg-red-50 border-red-200 text-red-800';
                } else {
                  optionStyles = 'bg-white border-gray-100 text-gray-500';
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
                  aria-label={`Opción ${String.fromCharCode(65 + index)}: ${opcion}`}
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

          {/* Confirm button (before feedback) */}
          {!showFeedback && (
            <button
              onClick={handleConfirmAnswer}
              disabled={selectedOption === null}
              className="w-full min-h-[48px] px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed bg-accent-600 hover:bg-accent-700 text-white mt-1"
              aria-label="Confirmar respuesta seleccionada"
            >
              Confirmar respuesta
            </button>
          )}

          {/* Feedback */}
          {showFeedback && (
            <>
              <div
                className={`px-4 py-4 text-base rounded-xl border mt-1 ${
                  selectedOption === questions[currentIndex].respuesta_correcta
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
                role="alert"
              >
                <p className="font-medium mb-2">
                  {selectedOption === questions[currentIndex].respuesta_correcta
                    ? '¡Correcto!'
                    : 'Incorrecto'}
                </p>
                <p className="leading-[1.6]">
                  {questions[currentIndex].explicacion}
                </p>
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
                  <p className="leading-[1.6] whitespace-pre-wrap">{altExplanation}</p>
                </div>
              )}

              {/* Next / See results button */}
              <button
                onClick={handleNext}
                className="w-full min-h-[48px] px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 bg-primary-600 hover:bg-primary-700 text-white mt-1"
                aria-label={
                  currentIndex < questions.length - 1
                    ? 'Ir a la siguiente pregunta'
                    : 'Ver resultados de la evaluación'
                }
              >
                {currentIndex < questions.length - 1
                  ? 'Siguiente'
                  : 'Ver resultados'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ===== FASE: RESUMEN FINAL ===== */}
      {phase === 'summary' && (
        <div className="flex flex-col gap-5 flex-1 px-1">
          {/* Score card */}
          <div className="flex flex-col items-center gap-3 px-4 py-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <p className="text-base text-gray-600">Tu resultado</p>
            <p className="text-4xl font-bold text-primary-700" aria-label={`Puntaje: ${score} de ${questions.length}`}>
              {score}/{questions.length}
            </p>
            <p className="text-lg font-medium text-gray-700">
              {percentage}% de aciertos
            </p>
            {/* Score message */}
            <p className="text-base text-gray-600 text-center mt-1">
              {percentage >= 80
                ? '¡Excelente! Dominas bien este tema.'
                : percentage >= 60
                ? 'Buen trabajo. Puedes mejorar repasando algunos conceptos.'
                : 'Sigue practicando. El repaso te ayudará a mejorar.'}
            </p>
          </div>

          {/* Per-question results */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-medium text-gray-700">
              Detalle por pregunta
            </h2>
            {questions.map((q, index) => {
              const answer = answers[index];
              const isCorrect = answer?.isCorrect;

              return (
                <div
                  key={index}
                  className={`px-4 py-3 text-base rounded-xl border ${
                    isCorrect
                      ? 'bg-green-50 border-green-100'
                      : 'bg-red-50 border-red-100'
                  }`}
                  aria-label={`Pregunta ${index + 1}: ${isCorrect ? 'correcta' : 'incorrecta'}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-base font-medium ${
                        isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                      aria-hidden="true"
                    >
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <p className="text-base text-gray-700 leading-[1.5] line-clamp-2">
                      {q.pregunta}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={handleRestart}
              className="w-full min-h-[48px] px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 bg-primary-600 hover:bg-primary-700 text-white"
              aria-label="Intentar otra prueba"
            >
              Intentar otra prueba
            </button>
            <button
              onClick={() => router.push(`/chat?tema=${encodeURIComponent(selectedTopic)}`)}
              className="w-full min-h-[48px] px-4 py-3 text-base font-medium rounded-2xl shadow-sm transition-colors duration-200 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-label={`Repasar ${selectedTopic} con el tutor en el chat`}
            >
              Repasar con el tutor
            </button>
          </div>
        </div>
      )}
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
