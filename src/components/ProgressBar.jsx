'use client';

/**
 * ProgressBar - Barra de progreso visual coloreada según nivel
 *
 * Props:
 * - level: 'no_visto' | 'basico' | 'intermedio' | 'avanzado'
 * - exercisesCompleted: number
 * - correctAnswers: number
 * - topic: string (para accesibilidad)
 */

// Thresholds para cada nivel
const LEVEL_THRESHOLDS = {
  basico: { exercises: 2 },
  intermedio: { exercises: 5, accuracy: 60 },
  avanzado: { exercises: 10, accuracy: 80 },
};

// Colores de la barra según nivel — suaves y consistentes (NFR-2: bajo ruido visual)
// Usa colores con saturación moderada para no sobrecargar visualmente
const BAR_COLORS = {
  no_visto: {
    bg: 'bg-gray-100',
    fill: 'bg-gray-400',
    text: 'text-gray-700',
  },
  basico: {
    bg: 'bg-accent-50',
    fill: 'bg-accent-400',
    text: 'text-accent-900',
  },
  intermedio: {
    bg: 'bg-primary-50',
    fill: 'bg-primary-400',
    text: 'text-primary-800',
  },
  avanzado: {
    bg: 'bg-amber-50',
    fill: 'bg-amber-400',
    text: 'text-amber-800',
  },
};

/**
 * Calcula el porcentaje de progreso hacia el siguiente nivel.
 * - no_visto → progreso hacia basico (2 ejercicios)
 * - basico → progreso hacia intermedio (5 ejercicios + 60%)
 * - intermedio → progreso hacia avanzado (10 ejercicios + 80%)
 * - avanzado → 100% (nivel máximo)
 */
function calculateProgress(level, exercisesCompleted, correctAnswers) {
  if (level === 'avanzado') return 100;

  const accuracy =
    exercisesCompleted > 0
      ? Math.round((correctAnswers / exercisesCompleted) * 100)
      : 0;

  if (level === 'no_visto') {
    // Progreso hacia basico: necesita 2 ejercicios
    const target = LEVEL_THRESHOLDS.basico.exercises;
    return Math.min(100, Math.round((exercisesCompleted / target) * 100));
  }

  if (level === 'basico') {
    // Progreso hacia intermedio: necesita 5 ejercicios + 60% accuracy
    const exerciseProgress =
      exercisesCompleted / LEVEL_THRESHOLDS.intermedio.exercises;
    const accuracyProgress = accuracy / LEVEL_THRESHOLDS.intermedio.accuracy;
    // Promedio ponderado de ambos factores
    const combined = (exerciseProgress + accuracyProgress) / 2;
    return Math.min(100, Math.round(combined * 100));
  }

  if (level === 'intermedio') {
    // Progreso hacia avanzado: necesita 10 ejercicios + 80% accuracy
    const exerciseProgress =
      exercisesCompleted / LEVEL_THRESHOLDS.avanzado.exercises;
    const accuracyProgress = accuracy / LEVEL_THRESHOLDS.avanzado.accuracy;
    const combined = (exerciseProgress + accuracyProgress) / 2;
    return Math.min(100, Math.round(combined * 100));
  }

  return 0;
}

export default function ProgressBar({
  level = 'no_visto',
  exercisesCompleted = 0,
  correctAnswers = 0,
  topic = '',
}) {
  const colors = BAR_COLORS[level] || BAR_COLORS.no_visto;
  const progress = calculateProgress(level, exercisesCompleted, correctAnswers);

  // Label descriptivo para accesibilidad
  const ariaLabel = topic
    ? `Progreso en ${topic}: ${progress}%`
    : `Progreso: ${progress}%`;

  return (
    <div className="w-full mt-3">
      {/* Barra de progreso */}
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={`w-full h-3 rounded-full overflow-hidden ${colors.bg}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colors.fill}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Texto de porcentaje */}
      <p
        className={`text-base mt-1 font-medium ${colors.text}`}
        aria-hidden="true"
      >
        {progress}% completado
      </p>
    </div>
  );
}
