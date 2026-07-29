import { NextResponse } from 'next/server';
import { getEvalPrompt } from '@/lib/prompts';
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
 * POST /api/eval
 * Genera 5 preguntas de opción múltiple para evaluación usando Gemini.
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

    // Generar el prompt de evaluación
    const evalPrompt = getEvalPrompt(topic);

    // Llamar a Gemini con instrucción de sistema para generar evaluación
    const systemInstruction = 'Eres un generador de evaluaciones de estadística para estudiantes con discalculia. NUNCA generes preguntas que pidan al estudiante calcular algo mentalmente. Todas las preguntas deben ser de interpretación y comprensión. Responde ÚNICAMENTE con JSON válido. Sin markdown, sin backticks, sin texto adicional antes o después del JSON.';

    const responseText = await generateResponse(
      systemInstruction,
      [], // Sin historial
      evalPrompt
    );

    // Parsear la respuesta JSON de Gemini
    let evalData;
    try {
      let cleanedResponse = responseText.trim();

      // Remover BOM si está presente
      if (cleanedResponse.charCodeAt(0) === 0xFEFF) {
        cleanedResponse = cleanedResponse.slice(1);
      }

      // Remover bloques de código markdown si Gemini los incluye
      cleanedResponse = cleanedResponse.replace(/^```(?:json|JSON)?\s*\n?/, '');
      cleanedResponse = cleanedResponse.replace(/\n?\s*```\s*$/, '');
      cleanedResponse = cleanedResponse.trim();

      // Si hay texto antes del JSON, extraer desde el primer {
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

      evalData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parseando JSON de evaluación:', parseError.message);
      console.error('Respuesta recibida:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'El modelo generó una respuesta con formato inválido. Intenta de nuevo.' },
        { status: 502 }
      );
    }

    // Validar estructura de la evaluación
    if (
      !evalData.preguntas ||
      !Array.isArray(evalData.preguntas) ||
      evalData.preguntas.length !== 5
    ) {
      return NextResponse.json(
        { error: 'La evaluación generada no tiene la estructura esperada (se requieren 5 preguntas). Intenta de nuevo.' },
        { status: 502 }
      );
    }

    // Validar estructura de cada pregunta
    for (let i = 0; i < evalData.preguntas.length; i++) {
      const pregunta = evalData.preguntas[i];
      if (
        !pregunta.pregunta ||
        !Array.isArray(pregunta.opciones) ||
        pregunta.opciones.length !== 4 ||
        typeof pregunta.respuesta_correcta !== 'number' ||
        pregunta.respuesta_correcta < 0 ||
        pregunta.respuesta_correcta > 3 ||
        !pregunta.explicacion
      ) {
        return NextResponse.json(
          { error: `La pregunta ${i + 1} no tiene la estructura esperada. Intenta de nuevo.` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(evalData);
  } catch (error) {
    console.error('Error en /api/eval:', error);

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
            { error: 'Error inesperado al generar la evaluación. Intenta de nuevo.' },
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
