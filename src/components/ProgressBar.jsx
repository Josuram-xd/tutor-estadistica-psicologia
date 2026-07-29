'use client';

/**
 * ProgressBar - Barra de progreso visual coloreada según nivel
 *
 * Props:
 * - level: 'no_visto' | 'basico' | 'intermedio' | 'avanzado' | 'experto' | 'maestro'
 * - exercisesCompleted: number
 * - correctAnswers: number
 * - topic: string (para accesibilidad)
 */

// Thresholds para cada nivel
const LEVEL_THRESHOLDS = {
  basico: { exercises: 1 },
  intermedio: { exercises: 5, accuracy: 60 },
  avanzado: { exercises: 10, accuracy: 75 },
  experto: { exercises: 15, accuracy: 85 },
  maestro: { exercises: 20, accuracy: 90 },
};

// Colores de la barra según nivel
const BAR_COLORS = {
  no_visto: {
    bg: 'bg-gray-100',
    fill: 'bg-gray-300',
    text: 'text-gray-500',
  },
  basico: {
    bg: 'bg-green-50',
    fill: 'bg-green-400',
    text: 'text-green-700',
  },
  intermedio: {
    bg: 'bg-blue-50',
    fill: 'bg-blue-400',
    text: 'text-blue-700',
  },
  avanzado: {
    bg: 'bg-purple-50',
    fill: 'bg-purple-400',
    text: 'text-purple-700',
  },
  experto: {
    bg: 'bg-amber-50',
    fill: 'bg-amber-400',
    text: 'text-amber-700',
  },
  maestro: {
    bg: 'bg-yellow-50',
    fill: 'bg-yellow-500',
    text: 'text-yellow-700',
  },
};

/**
 * Calcula el porcentaje de progreso hacia el siguiente nivel.
 */
function calculateProgress(level, exercisesCompleted, correctAnswers) {
  if (level === 'maestro') return 100;

  const accuracy =
    exercisesCompleted > 0
      ? Math.round((correctAnswers / exercisesCompleted) * 100)
      : 0;

  if (level === 'no_visto') {
    const target = LEVEL_THRESHOLDS.basico.exercises;
    return Math.min(100, Math.round((exercisesCompleted / target) * 100));
  }

  if (level === 'basico') {
    const exerciseProgress =
      exercisesCompleted / LEVEL_THRESHOLDS.intermedio.exercises;
    const accuracyProgress = accuracy / LEVEL_THRESHOLDS.intermedio.accuracy;
    const combined = (exerciseProgress + accuracyProgress) / 2;
    return Math.min(100, Math.round(combined * 100));
  }

  if (level === 'intermedio') {
    const exerciseProgress =
      exercisesCompleted / LEVEL_THRESHOLDS.avanzado.exercises;
    const accuracyProgress = accuracy / LEVEL_THRESHOLDS.avanzado.accuracy;
    const combined = (exerciseProgress + accuracyProgress) / 2;
    return Math.min(100, Math.round(combined * 100));
  }

  if (level === 'avanzado') {
    const exerciseProgress =
      exercisesCompleted / LEVEL_THRESHOLDS.experto.exercises;
    const accuracyProgress = accuracy / LEVEL_THRESHOLDS.experto.accuracy;
    const combined = (exerciseProgress + accuracyProgress) / 2;
    return Math.min(100, Math.round(combined * 100));
  }

  if (level === 'experto') {
    const exerciseProgress =
      exercisesCompleted / LEVEL_THRESHOLDS.maestro.exercises;
    const accuracyProgress = accuracy / LEVEL_THRESHOLDS.maestro.accuracy;
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
        {progress}% hacia el siguiente nivel
      </p>
    </div>
  );
}
