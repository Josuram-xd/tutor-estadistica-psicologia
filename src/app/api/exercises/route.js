import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getExercisePrompt } from '@/lib/prompts';
import { generateResponse, GeminiErrorType } from '@/lib/gemini';

const VALID_TOPICS = [
  'Probabilidad',
  'Hipótesis',
  't-Student',
  'ANOVA',
  'Chi-cuadrada',
  'Correlación',
  'Regresión',
];

/**
 * POST /api/exercises
 * Genera un ejercicio estructurado usando Gemini.
 * Body: { topic: string, userId: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { topic, userId } = body;

    // Validar campos requeridos
    if (!topic || !userId) {
      return NextResponse.json(
        { error: 'Se requieren los campos topic y userId' },
        { status: 400 }
      );
    }

    // Validar que el tema sea válido
    if (!VALID_TOPICS.includes(topic)) {
      return NextResponse.json(
        { error: `Tema inválido. Opciones: ${VALID_TOPICS.join(', ')}` },
        { status: 400 }
      );
    }

    // Obtener el progreso del usuario para el tema seleccionado
    let level = 'no_visto';

    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select('level')
      .eq('user_id', userId)
      .eq('topic', topic)
      .single();

    if (!progressError && progressData) {
      level = progressData.level;
    }
    // Si no hay registro de progreso, usamos 'no_visto' por defecto

    // Generar el prompt del ejercicio
    const exercisePrompt = getExercisePrompt(topic, level);

    // Llamar a Gemini con instrucción de sistema para responder solo con JSON válido
    const systemInstruction = 'Eres un generador de ejercicios de estadística para estudiantes con discalculia. NUNCA pidas al estudiante que haga cálculos mentales. Los pasos siempre muestran el cálculo ya resuelto y la pregunta final es de interpretación. Responde ÚNICAMENTE con JSON válido. Sin markdown, sin backticks, sin texto adicional antes o después del JSON.';

    const responseText = await generateResponse(
      systemInstruction,
      [], // Sin historial
      exercisePrompt,
      null // Sin imagen
    );

    // Parsear la respuesta JSON de Gemini
    let exercise;
    try {
      // Limpiar posibles backticks, BOM, o texto alrededor del JSON
      let cleanedResponse = responseText.trim();

      // Remover BOM (Byte Order Mark) si está presente
      if (cleanedResponse.charCodeAt(0) === 0xFEFF) {
        cleanedResponse = cleanedResponse.slice(1);
      }

      // Remover bloques de código markdown si Gemini los incluye
      // Maneja ```json, ```JSON, ``` y variantes con espacios
      cleanedResponse = cleanedResponse.replace(/^```(?:json|JSON)?\s*\n?/, '');
      cleanedResponse = cleanedResponse.replace(/\n?\s*```\s*$/, '');
      cleanedResponse = cleanedResponse.trim();

      // Si aún contiene texto antes del JSON, intentar extraer el objeto JSON
      if (!cleanedResponse.startsWith('{')) {
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart !== -1) {
          cleanedResponse = cleanedResponse.slice(jsonStart);
        }
      }

      // Si hay texto después del JSON, cortar al último }
      if (cleanedResponse.lastIndexOf('}') < cleanedResponse.length - 1) {
        cleanedResponse = cleanedResponse.slice(0, cleanedResponse.lastIndexOf('}') + 1);
      }

      exercise = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parseando JSON de Gemini:', parseError.message);
      console.error('Respuesta recibida:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'El modelo generó una respuesta con formato inválido. Intenta de nuevo.' },
        { status: 502 }
      );
    }

    // Validar estructura completa del ejercicio
    if (
      !exercise.contexto ||
      !Array.isArray(exercise.pasos) ||
      exercise.pasos.length === 0 ||
      !exercise.pregunta_interpretacion ||
      !Array.isArray(exercise.opciones) ||
      exercise.opciones.length === 0 ||
      typeof exercise.respuesta_correcta !== 'number' ||
      !exercise.feedback
    ) {
      return NextResponse.json(
        { error: 'El ejercicio generado no tiene la estructura esperada. Intenta de nuevo.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ exercise });
  } catch (error) {
    console.error('Error en /api/exercises:', error);

    // Manejar errores clasificados de Gemini
    if (error.name === 'GeminiError') {
      switch (error.type) {
        case GeminiErrorType.RATE_LIMIT:
          return NextResponse.json(
            { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
            { status: 429 }
          );
        case GeminiErrorType.API_UNAVAILABLE:
          return NextResponse.json(
            { error: 'El servicio de IA no está disponible en este momento. Intenta en unos minutos.' },
            { status: 503 }
          );
        case GeminiErrorType.NETWORK_ERROR:
          return NextResponse.json(
            { error: 'Error de conexión. Verifica tu internet e intenta de nuevo.' },
            { status: 503 }
          );
        default:
          return NextResponse.json(
            { error: 'Error inesperado al generar el ejercicio. Intenta de nuevo.' },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
