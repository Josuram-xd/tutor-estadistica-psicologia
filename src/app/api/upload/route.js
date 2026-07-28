import { NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf';
import { generateResponse } from '@/lib/gemini';
import supabase from '@/lib/supabase';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 15000; // Truncar texto a 15,000 caracteres

/**
 * POST /api/upload
 *
 * Acepta DOS tipos de request:
 *
 * 1. FormData (Content-Type: multipart/form-data) — PDF upload
 *    - file: archivo PDF
 *    - conversationId: UUID de la conversación
 *    - userId: UUID del usuario
 *
 * 2. JSON (Content-Type: application/json) — Photo OCR o texto directo
 *    - type: 'photo' | 'text'
 *    - imageBase64: string (solo para type='photo') — data URL de la imagen
 *    - text: string (solo para type='text') — texto directo
 *    - conversationId: UUID de la conversación
 *    - userId: UUID del usuario
 *
 * Responde con:
 *   - success: boolean
 *   - text: texto extraído (truncado a 15,000 chars)
 *   - charCount: longitud del texto extraído
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Determinar si es FormData (PDF) o JSON (photo/text)
    if (contentType.includes('multipart/form-data')) {
      return await handlePdfUpload(request);
    } else if (contentType.includes('application/json')) {
      return await handleJsonUpload(request);
    } else {
      return NextResponse.json(
        { error: 'Tipo de contenido no soportado.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error procesando upload:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}

/**
 * Maneja subida de PDFs via FormData.
 */
async function handlePdfUpload(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const conversationId = formData.get('conversationId');
  const userId = formData.get('userId');

  if (!file) {
    return NextResponse.json(
      { error: 'No se recibió ningún archivo.' },
      { status: 400 }
    );
  }

  // Validar tipo de archivo
  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Solo se aceptan archivos PDF.' },
      { status: 400 }
    );
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'El archivo excede el tamaño máximo de 10MB.' },
      { status: 400 }
    );
  }

  // Leer el archivo como buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extraer texto del PDF
  const extractedText = await extractTextFromPDF(buffer);

  if (!extractedText || extractedText.trim().length === 0) {
    return NextResponse.json(
      { error: 'No se pudo extraer texto del PDF. Verifica que el archivo contenga texto legible.' },
      { status: 422 }
    );
  }

  // Truncar a 15,000 caracteres
  const truncatedText = extractedText.slice(0, MAX_TEXT_LENGTH);

  // Guardar material_context en la conversación del usuario
  await saveMaterialContext(conversationId, userId, truncatedText);

  return NextResponse.json({
    success: true,
    text: truncatedText,
    charCount: truncatedText.length,
  });
}

/**
 * Maneja subidas JSON: foto (OCR via Gemini) o texto directo.
 */
async function handleJsonUpload(request) {
  const body = await request.json();
  const { type, imageBase64, text, conversationId, userId } = body;

  if (type === 'photo') {
    return await handlePhotoOcr(imageBase64, conversationId, userId);
  } else if (type === 'text') {
    return await handleTextUpload(text, conversationId, userId);
  } else {
    return NextResponse.json(
      { error: 'Tipo de material no reconocido. Usa "photo" o "text".' },
      { status: 400 }
    );
  }
}

/**
 * Procesa una foto enviando a Gemini Vision para OCR.
 */
async function handlePhotoOcr(imageBase64, conversationId, userId) {
  if (!imageBase64) {
    return NextResponse.json(
      { error: 'No se recibió la imagen. Intenta de nuevo.' },
      { status: 400 }
    );
  }

  // Validar que parece una data URL de imagen válida
  if (!imageBase64.startsWith('data:image/')) {
    return NextResponse.json(
      { error: 'Formato de imagen no válido.' },
      { status: 400 }
    );
  }

  try {
    // Usar Gemini Vision para OCR — prompt en español
    const ocrPrompt = 'Extrae todo el texto visible en esta imagen. Devuelve solo el texto extraído, sin explicaciones adicionales.';

    const extractedText = await generateResponse(
      'Eres un asistente de OCR. Tu única tarea es extraer texto de imágenes con la mayor precisión posible.',
      [], // Sin historial — es una petición aislada de OCR
      ocrPrompt,
      imageBase64
    );

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto de la imagen. Verifica que la foto contenga texto legible.' },
        { status: 422 }
      );
    }

    // Truncar a 15,000 caracteres
    const truncatedText = extractedText.trim().slice(0, MAX_TEXT_LENGTH);

    // Guardar material_context en la conversación del usuario
    await saveMaterialContext(conversationId, userId, truncatedText);

    return NextResponse.json({
      success: true,
      text: truncatedText,
      charCount: truncatedText.length,
    });
  } catch (error) {
    console.error('Error en OCR con Gemini:', error);

    // Mensajes de error amigables según el tipo de error
    if (error.type === 'RATE_LIMIT') {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
        { status: 429 }
      );
    }

    if (error.type === 'API_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'El servicio de OCR no está disponible en este momento. Intenta más tarde.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error al procesar la imagen. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}

/**
 * Procesa texto directo pegado por el usuario.
 */
async function handleTextUpload(text, conversationId, userId) {
  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: 'No se recibió texto. Ingresa algún contenido.' },
      { status: 400 }
    );
  }

  // Truncar a 15,000 caracteres
  const truncatedText = text.trim().slice(0, MAX_TEXT_LENGTH);

  // Guardar material_context en la conversación del usuario
  await saveMaterialContext(conversationId, userId, truncatedText);

  return NextResponse.json({
    success: true,
    text: truncatedText,
    charCount: truncatedText.length,
  });
}

/**
 * Guarda el texto extraído como material_context en la conversación.
 * Filtra por conversationId Y userId para seguridad.
 */
async function saveMaterialContext(conversationId, userId, text) {
  if (!conversationId) return;

  let query = supabase
    .from('conversations')
    .update({
      material_context: text,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  // Filtrar por user_id si se proporcionó (seguridad)
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error: updateError } = await query;

  if (updateError) {
    console.error('Error al guardar material_context:', updateError);
    // No fallamos la request completa, solo logueamos el error
  }
}
