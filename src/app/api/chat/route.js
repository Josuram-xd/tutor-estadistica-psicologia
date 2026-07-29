import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { generateResponse, GeminiErrorType } from "@/lib/gemini";
import { getSystemPrompt } from "@/lib/prompts";

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, userId, conversationId } = body;

    // Validate required fields
    if (!message || !userId) {
      return NextResponse.json(
        { error: "Se requieren los campos message y userId" },
        { status: 400 }
      );
    }

    // Load or create conversation
    let conversation;

    if (conversationId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Conversación no encontrada" },
          { status: 404 }
        );
      }

      conversation = data;
    } else {
      // Create a new conversation
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          messages: [],
          material_context: null,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Error al crear la conversación" },
          { status: 500 }
        );
      }

      conversation = data;
    }

    // Load user progress
    const { data: progress } = await supabase
      .from("progress")
      .select("topic, level, exercises_completed, correct_answers")
      .eq("user_id", userId);

    // Build system prompt with progress and material context
    const systemPrompt = getSystemPrompt(
      progress || [],
      conversation.material_context
    );

    // Prepare history from conversation messages
    const history = conversation.messages || [];

    // Call Gemini
    let aiResponse;
    try {
      aiResponse = await generateResponse(systemPrompt, history, message);
    } catch (geminiError) {
      console.error("Error de Gemini:", geminiError.message, geminiError.type, geminiError.originalError?.message);

      switch (geminiError.type) {
        case GeminiErrorType.RATE_LIMIT:
          return NextResponse.json(
            {
              error: "El servicio está ocupado en este momento. Por favor espera unos segundos e intenta de nuevo.",
              retryable: true,
            },
            { status: 429 }
          );

        case GeminiErrorType.API_UNAVAILABLE:
          return NextResponse.json(
            {
              error: "El servicio de IA no está disponible temporalmente. Por favor intenta más tarde.",
              retryable: true,
            },
            { status: 503 }
          );

        case GeminiErrorType.NETWORK_ERROR:
          return NextResponse.json(
            {
              error: "No se pudo conectar con el servicio. Verifica tu conexión e intenta de nuevo.",
              retryable: true,
            },
            { status: 502 }
          );

        default:
          return NextResponse.json(
            {
              error: "Ocurrió un problema al generar la respuesta. Por favor intenta de nuevo.",
              retryable: false,
            },
            { status: 500 }
          );
      }
    }

    // Append user and assistant messages to conversation
    const now = new Date().toISOString();
    const updatedMessages = [
      ...history,
      { role: "user", content: message, timestamp: now },
      { role: "assistant", content: aiResponse, timestamp: now },
    ];

    // Update conversation in Supabase
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        messages: updatedMessages,
        updated_at: now,
      })
      .eq("id", conversation.id);

    if (updateError) {
      console.error("Error al guardar mensajes:", updateError);
      // Still return the response even if saving fails
    }

    return NextResponse.json({
      response: aiResponse,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
