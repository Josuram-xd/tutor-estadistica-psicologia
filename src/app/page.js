'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      router.replace('/chat');
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!username.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (activeTab === 'register') {
      if (username.trim().length < 3) {
        setError('El nombre de usuario debe tener al menos 3 caracteres');
        return;
      }
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres');
        return;
      }
    }

    setLoading(true);

    try {
      const action = activeTab === 'login' ? 'login' : 'register';
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error inesperado');
        return;
      }

      // Save user_id and redirect
      localStorage.setItem('user_id', data.user_id);
      router.replace('/chat');
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Show nothing while checking auth to avoid flash
  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-primary-700 text-lg">Cargando...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-mobile space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary-800">
            Tutor de Estadística
          </h1>
          <p className="text-base text-gray-600">
            Tu tutor personalizado de estadística inferencial
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-primary-50 p-1" role="tablist" aria-label="Tipo de acceso">
          <button
            role="tab"
            aria-selected={activeTab === 'login'}
            aria-controls="auth-form"
            className={`flex-1 min-h-touch rounded-xl py-3 text-base font-medium transition-colors duration-200 ${
              activeTab === 'login'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-primary-800 hover:text-primary-900'
            }`}
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
          >
            Iniciar Sesión
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'register'}
            aria-controls="auth-form"
            className={`flex-1 min-h-touch rounded-xl py-3 text-base font-medium transition-colors duration-200 ${
              activeTab === 'register'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-primary-800 hover:text-primary-900'
            }`}
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form
          id="auth-form"
          role="tabpanel"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Nombre de usuario
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario"
                className="w-full min-h-touch rounded-xl border-2 border-primary-100 bg-white px-4 py-3 text-base text-gray-800 placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors duration-200"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full min-h-touch rounded-xl border-2 border-primary-100 bg-white px-4 py-3 text-base text-gray-800 placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors duration-200"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-base text-red-700"
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-touch rounded-xl bg-primary-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading
              ? 'Cargando...'
              : activeTab === 'login'
                ? 'Iniciar Sesión'
                : 'Crear Cuenta'
            }
          </button>
        </form>
      </div>
    </main>
  );
}
