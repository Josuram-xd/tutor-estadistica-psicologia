import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import supabase from '@/lib/supabase';

export async function POST(request) {
  try {
    const { action, username, password } = await request.json();

    if (action === 'register') {
      return await handleRegister(username, password);
    } else if (action === 'login') {
      return await handleLogin(username, password);
    } else {
      return NextResponse.json(
        { error: 'Acción inválida. Use "register" o "login".' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function handleRegister(username, password) {
  if (!username || !password) {
    return NextResponse.json(
      { error: 'El nombre de usuario y la contraseña son obligatorios' },
      { status: 400 }
    );
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: 'El nombre de usuario debe tener al menos 3 caracteres' },
      { status: 400 }
    );
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 4 caracteres' },
      { status: 400 }
    );
  }

  // Check if username already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (existingUser) {
    return NextResponse.json(
      { error: 'Ese nombre de usuario ya está en uso. Prueba con otro.' },
      { status: 409 }
    );
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Insert new user
  const { data, error } = await supabase
    .from('users')
    .insert({ username, password_hash })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }

  // Initialize progress for all 7 topics with level 'no_visto'
  const topics = [
    'Probabilidad',
    'Hipótesis',
    't-Student',
    'ANOVA',
    'Chi-cuadrada',
    'Correlación',
    'Regresión',
  ];

  const progressRows = topics.map((topic) => ({
    user_id: data.id,
    topic,
    level: 'no_visto',
    exercises_completed: 0,
    correct_answers: 0,
  }));

  const { error: progressError } = await supabase
    .from('progress')
    .insert(progressRows);

  if (progressError) {
    console.error('Error initializing progress for new user:', progressError);
    // Still return success — the user was created; progress can be initialized later
  }

  return NextResponse.json({ user_id: data.id }, { status: 201 });
}

async function handleLogin(username, password) {
  if (!username || !password) {
    return NextResponse.json(
      { error: 'El nombre de usuario y la contraseña son obligatorios' },
      { status: 400 }
    );
  }

  // Look up user by username
  const { data: user, error } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('username', username)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: 'No encontramos ese nombre de usuario. ¿Quieres registrarte?' },
      { status: 404 }
    );
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return NextResponse.json(
      { error: 'La contraseña no es correcta. Revísala e intenta de nuevo.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ user_id: user.id });
}
