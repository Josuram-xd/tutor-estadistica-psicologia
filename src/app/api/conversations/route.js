import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Se requiere el parámetro userId" },
        { status: 400 }
      );
    }

    // Fetch the most recent conversation for this user
    const { data, error } = await supabase
      .from("conversations")
      .select("id, messages, material_context, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      // No conversation found — not an error, just empty
      return NextResponse.json({ conversation: null });
    }

    if (error) {
      console.error("Error al buscar conversación:", error);
      return NextResponse.json(
        { error: "Error al buscar la conversación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Error en GET /api/conversations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Se requiere el campo userId" },
        { status: 400 }
      );
    }

    // Create a new empty conversation for the user
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        messages: [],
        material_context: null,
      })
      .select("id, messages, material_context, updated_at")
      .single();

    if (error) {
      console.error("Error al crear conversación:", error);
      return NextResponse.json(
        { error: "Error al crear la conversación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/conversations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
