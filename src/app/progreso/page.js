'use client';

import { useState, useEffect } from 'react';
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

const LEVEL_CONFIG = {
  no_visto: {
    label: '',
    emoji: '',
    color: 'bg-gray-50 text-gray-400',
    order: 0,
  },
  basico: {
    label: 'Novato',
    emoji: '🌱',
    color: 'bg-green-50 text-green-700',
    order: 1,
  },
  intermedio: {
    label: 'Aprendiz',
    emoji: '📖',
    color: 'bg-blue-50 text-blue-700',
    order: 2,
  },
  avanzado: {
    label: 'Competente',
    emoji: '💪',
    color: 'bg-purple-50 text-purple-700',
    order: 3,
  },
  experto: {
    label: 'Experto',
    emoji: '🧠',
    color: 'bg-amber-50 text-amber-700',
    order: 4,
  },
  maestro: {
    label: 'Maestro',
    emoji: '🏆',
    color: 'bg-yellow-50 text-yellow-700',
    order: 5,
  },
};

export default function ProgresoPage() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/');
      return;
    }
    fetchProgress(userId);
  }, [router]);

  async function fetchProgress(userId) {
    try {
      const res = await fetch(`/api/progress?userId=${userId}`);
      if (!res.ok) {
        throw new Error('Error al cargar progreso');
      }
      const data = await res.json();
      setProgress(data.progress || []);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('No se pudo cargar tu progreso. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // Get progress data for a given topic, return defaults if not found
  function getTopicProgress(topic) {
    const record = progress.find((p) => p.topic === topic);
    if (record) {
      return {
        level: record.level || 'no_visto',
        exercisesCompleted: record.exercises_completed || 0,
        correctAnswers: record.correct_answers || 0,
      };
    }
    return {
      level: 'no_visto',
      exercisesCompleted: 0,
      correctAnswers: 0,
    };
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-slow-spin" />
          <p className="text-base text-gray-500">Cargando progreso...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] items-center justify-center p-6">
        <p className="text-base text-red-600 dark:text-red-400 text-center" role="alert">
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            const userId = localStorage.getItem('user_id');
            if (userId) fetchProgress(userId);
          }}
          className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-2xl text-base font-medium hover:bg-primary-700 transition-colors min-h-touch"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-mobile mx-auto animate-page-fade-in">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">
          Mi Progreso
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
          Tu avance en cada tema de estadística
        </p>
      </header>

      {/* Cards list - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-24" role="list" aria-label="Progreso por tema">
        <div className="flex flex-col gap-4">
          {TOPICS.map((topic) => {
            const { level, exercisesCompleted, correctAnswers } = getTopicProgress(topic);
            const levelInfo = LEVEL_CONFIG[level] || LEVEL_CONFIG.no_visto;
            const accuracy = exercisesCompleted > 0
              ? Math.round((correctAnswers / exercisesCompleted) * 100)
              : null;

            return (
              <article
                key={topic}
                role="listitem"
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5"
              >
                {/* Topic name + level badge */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {topic}
                  </h2>
                  {levelInfo.label ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-base font-medium ${levelInfo.color}`}
                      aria-label={`Nivel: ${levelInfo.label}`}
                    >
                      <span aria-hidden="true">{levelInfo.emoji}</span>
                      {levelInfo.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-base text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700">
                      Sin empezar
                    </span>
                  )}
                </div>

                {/* Statistics */}
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-base text-gray-500 dark:text-gray-400">Ejercicios</span>
                    <span className="text-lg font-medium text-foreground">
                      {exercisesCompleted}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base text-gray-500 dark:text-gray-400">Correctas</span>
                    <span className="text-lg font-medium text-foreground">
                      {correctAnswers}
                    </span>
                  </div>
                  {accuracy !== null && (
                    <div className="flex flex-col">
                      <span className="text-base text-gray-500 dark:text-gray-400">Precisión</span>
                      <span className="text-lg font-medium text-foreground">
                        {accuracy}%
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
