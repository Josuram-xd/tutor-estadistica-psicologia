import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Tipos de error para clasificación.
 */
export const GeminiErrorType = {
  RATE_LIMIT: "RATE_LIMIT",
  API_UNAVAILABLE: "API_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN: "UNKNOWN",
};

/**
 * Error personalizado con clasificación.
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
 * Clasifica un error según su tipo.
 */
function classifyError(error) {
  const message = error.message || "";
  const status = error.status || error.statusCode || null;

  // Rate limiting (429)
  if (
    status === 429 ||
    message.includes("429") ||
    message.toLowerCase().includes("rate") ||
    message.toLowerCase().includes("quota")
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
    message.toLowerCase().includes("unavailable") ||
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
    message.toLowerCase().includes("fetch failed")
  ) {
    return new GeminiError(
      "Error de red",
      GeminiErrorType.NETWORK_ERROR,
      error
    );
  }

  return new GeminiError(
    message || "Error desconocido",
    GeminiErrorType.UNKNOWN,
    error
  );
}

/**
 * Genera una respuesta usando Groq (Llama 3).
 *
 * @param {string} systemPrompt - Instrucciones de sistema para el modelo
 * @param {Array<{role: string, content: string}>} history - Historial de conversación [{role, content}]
 * @param {string} userMessage - Mensaje actual del usuario
 * @returns {Promise<string>} Texto de respuesta generado
 * @throws {GeminiError} Error clasificado con tipo específico
 */
export async function generateResponse(systemPrompt, history, userMessage) {
  // Construir mensajes en formato OpenAI/Groq
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Agregar historial
  for (const msg of (history || [])) {
    messages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    });
  }

  // Agregar mensaje actual
  messages.push({ role: "user", content: userMessage });

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2048,
    });

    return chatCompletion.choices[0]?.message?.content || "No pude generar una respuesta.";
  } catch (error) {
    throw classifyError(error);
  }
}
