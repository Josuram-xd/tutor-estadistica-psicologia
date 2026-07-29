import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

/**
 * Calcula el nivel basado en ejercicios completados y porcentaje de aciertos.
 * 
 * Lógica de progresión:
 * - no_visto: Sin ejercicios completados
 * - basico: ≥1 ejercicio completado (Novato)
 * - intermedio: ≥5 ejercicios + ≥60% aciertos (Aprendiz)
 * - avanzado: ≥10 ejercicios + ≥75% aciertos (Competente)
 * - experto: ≥15 ejercicios + ≥85% aciertos (Experto)
 * - maestro: ≥20 ejercicios + ≥90% aciertos (Maestro)
 */
function calculateLevel(exercisesCompleted, correctAnswers) {
  if (exercisesCompleted === 0) return 'no_visto';

  const correctRate = correctAnswers / exercisesCompleted;

  if (exercisesCompleted >= 20 && correctRate >= 0.9) return 'maestro';
  if (exercisesCompleted >= 15 && correctRate >= 0.85) return 'experto';
  if (exercisesCompleted >= 10 && correctRate >= 0.75) return 'avanzado';
  if (exercisesCompleted >= 5 && correctRate >= 0.6) return 'intermedio';
  if (exercisesCompleted >= 1) return 'basico';

  return 'no_visto';
}

/**
 * PUT /api/progress
 * Actualiza el progreso del usuario para un tema añadiendo los resultados de una sesión completa.
 * Body: { userId, topic, exercisesCompleted, correctAnswers }
 * - Suma exercisesCompleted al total existente
 * - Suma correctAnswers al total existente
 * - Recalcula el nivel según la lógica de progresión
 * 
 * Usado al finalizar una evaluación para enviar todos los resultados de la sesión de una vez.
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId, topic, exercisesCompleted, correctAnswers } = body;

    if (!userId || !topic) {
      return NextResponse.json(
        { error: 'userId y topic son requeridos' },
        { status: 400 }
      );
    }

    if (
      exercisesCompleted === undefined || exercisesCompleted === null ||
      correctAnswers === undefined || correctAnswers === null
    ) {
      return NextResponse.json(
        { error: 'exercisesCompleted y correctAnswers son requeridos' },
        { status: 400 }
      );
    }

    if (exercisesCompleted < 0 || correctAnswers < 0 || correctAnswers > exercisesCompleted) {
      return NextResponse.json(
        { error: 'Valores inválidos: correctAnswers no puede ser mayor que exercisesCompleted' },
        { status: 400 }
      );
    }

    // Buscar progreso existente para este usuario + tema
    const { data: existing, error: fetchError } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('topic', topic)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching progress:', fetchError);
      return NextResponse.json(
        { error: 'Error al consultar progreso' },
        { status: 500 }
      );
    }

    const totalExercises = (existing?.exercises_completed || 0) + exercisesCompleted;
    const totalCorrect = (existing?.correct_answers || 0) + correctAnswers;
    const level = calculateLevel(totalExercises, totalCorrect);

    // Upsert el registro de progreso
    const { data: updated, error: upsertError } = await supabase
      .from('progress')
      .upsert(
        {
          user_id: userId,
          topic,
          level,
          exercises_completed: totalExercises,
          correct_answers: totalCorrect,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,topic' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting progress:', upsertError);
      return NextResponse.json(
        { error: 'Error al actualizar progreso' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: updated });
  } catch (err) {
    console.error('Error en PUT /api/progress:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/progress?userId=<uuid>
 * Devuelve todos los registros de progreso para un usuario (los 7 temas).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .order('topic', { ascending: true });

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { error: 'Error al consultar progreso' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: data });
  } catch (err) {
    console.error('Error en GET /api/progress:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 * Actualiza el progreso del usuario para un tema dado.
 * Body: { userId, topic, correct } o { userId, topic, isCorrect }
 * - Incrementa exercises_completed en 1
 * - Si correct/isCorrect es true, incrementa correct_answers en 1
 * - Recalcula el nivel según la lógica de progresión
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, topic } = body;
    // Aceptar tanto "correct" como "isCorrect" para compatibilidad
    const isCorrect = body.correct !== undefined ? body.correct : body.isCorrect;

    if (!userId || !topic) {
      return NextResponse.json(
        { error: 'userId y topic son requeridos' },
        { status: 400 }
      );
    }

    if (isCorrect === undefined || isCorrect === null) {
      return NextResponse.json(
        { error: 'correct (boolean) es requerido' },
        { status: 400 }
      );
    }

    // Buscar progreso existente para este usuario + tema
    const { data: existing, error: fetchError } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('topic', topic)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for new topics)
      console.error('Error fetching progress:', fetchError);
      return NextResponse.json(
        { error: 'Error al consultar progreso' },
        { status: 500 }
      );
    }

    const exercisesCompleted = (existing?.exercises_completed || 0) + 1;
    const correctAnswers = (existing?.correct_answers || 0) + (isCorrect ? 1 : 0);
    const level = calculateLevel(exercisesCompleted, correctAnswers);

    // Upsert el registro de progreso usando constraint UNIQUE(user_id, topic)
    const { data: updated, error: upsertError } = await supabase
      .from('progress')
      .upsert(
        {
          user_id: userId,
          topic,
          level,
          exercises_completed: exercisesCompleted,
          correct_answers: correctAnswers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,topic' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting progress:', upsertError);
      return NextResponse.json(
        { error: 'Error al actualizar progreso' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: updated });
  } catch (err) {
    console.error('Error en POST /api/progress:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
