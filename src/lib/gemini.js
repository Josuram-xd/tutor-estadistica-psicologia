import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Tipos de error de Gemini para clasificación.
 */
export const GeminiErrorType = {
  RATE_LIMIT: "RATE_LIMIT",
  API_UNAVAILABLE: "API_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN: "UNKNOWN",
};

/**
 * Error personalizado para errores de Gemini con clasificación.
 */
export class GeminiError extends Error {
  constructor(message, type, originalError = null) {
    super(message);
    this.name = "GeminiError";
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * Clasifica un error de Gemini según su tipo.
 *
 * @param {Error} error - Error original capturado
 * @returns {GeminiError} Error clasificado
 */
function classifyError(error) {
  const message = error.message || "";
  const status = error.status || error.httpStatusCode || null;

  // Rate limiting (429)
  if (
    status === 429 ||
    message.includes("429") ||
    message.toLowerCase().includes("rate") ||
    message.toLowerCase().includes("quota") ||
    message.toLowerCase().includes("resource exhausted")
  ) {
    return new GeminiError(
      "Rate limit alcanzado",
      GeminiErrorType.RATE_LIMIT,
      error
    );
  }

  // API no disponible (503, 500, 502)
  if (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    message.includes("503") ||
    message.includes("500") ||
    message.toLowerCase().includes("unavailable") ||
    message.toLowerCase().includes("internal") ||
    message.toLowerCase().includes("overloaded")
  ) {
    return new GeminiError(
      "API no disponible",
      GeminiErrorType.API_UNAVAILABLE,
      error
    );
  }

  // Errores de red/timeout
  if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("econnrefused") ||
    message.toLowerCase().includes("enotfound") ||
    message.toLowerCase().includes("fetch failed") ||
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.code === "ETIMEDOUT"
  ) {
    return new GeminiError(
      "Error de red",
      GeminiErrorType.NETWORK_ERROR,
      error
    );
  }

  // Error desconocido
  return new GeminiError(
    message || "Error desconocido al comunicarse con Gemini",
    GeminiErrorType.UNKNOWN,
    error
  );
}

/**
 * Genera una respuesta usando Gemini 2.5 Flash.
 *
 * @param {string} systemPrompt - Instrucciones de sistema para el modelo
 * @param {Array<{role: string, content: string}>} history - Historial de conversación [{role, content}]
 * @param {string} userMessage - Mensaje actual del usuario
 * @param {string|null} imageBase64 - Imagen en base64 para OCR (opcional)
 * @returns {Promise<string>} Texto de respuesta generado
 * @throws {GeminiError} Error clasificado con tipo específico
 */
export async function generateResponse(systemPrompt, history, userMessage, imageBase64 = null) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  // Convertir historial al formato del SDK de Gemini
  // El SDK espera: { role: "user" | "model", parts: [{ text }] }
  const geminiHistory = (history || []).map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: [{ text: msg.content }],
  }));

  // Construir las partes del mensaje actual
  const currentParts = [];

  if (imageBase64) {
    // Extraer el tipo MIME si viene con el prefijo data:image/...;base64,
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;

    if (imageBase64.includes(",")) {
      const [header, data] = imageBase64.split(",");
      const mimeMatch = header.match(/data:(.+);base64/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      base64Data = data;
    }

    currentParts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  currentParts.push({ text: userMessage });

  try {
    // Iniciar chat con historial y enviar mensaje
    const chat = model.startChat({
      history: geminiHistory,
    });

    const result = await chat.sendMessage(currentParts);
    const response = result.response;

    return response.text();
  } catch (error) {
    throw classifyError(error);
  }
}
