# Tutor IA de Estadística Inferencial para Psicología

Tutor inteligente adaptado a discalculia que enseña estadística inferencial con enfoque en interpretación, usando ejemplos de psicología.

**Stack:** Next.js 14 (App Router) + Tailwind CSS + Supabase + Gemini 2.5 Flash  
**Deploy:** Vercel (free tier)

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (ver sección "Variables de entorno")

# 3. Ejecutar en desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de entorno

El proyecto requiere 3 variables de entorno para funcionar:

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `GEMINI_API_KEY` | Server-side | API key de Google Gemini 2.5 Flash |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública (client) | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side | Service role key de Supabase |

### Cómo obtener cada valor

#### GEMINI_API_KEY
1. Ir a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Iniciar sesión con cuenta Google
3. Hacer clic en "Create API Key"
4. Copiar la key generada

> El modelo usado es **Gemini 2.5 Flash** (gratis con límites generosos).

#### NEXT_PUBLIC_SUPABASE_URL
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto (o crear uno nuevo)
3. Ir a **Settings → API**
4. Copiar el valor de **Project URL** (formato: `https://xxxxx.supabase.co`)

#### SUPABASE_SERVICE_ROLE_KEY
1. En el mismo panel de Supabase: **Settings → API**
2. En la sección "Project API keys", copiar **service_role** (secret)

> **Importante:** La service role key tiene acceso total a la base de datos. Nunca exponerla en el frontend ni commitearla al repositorio.

### Configuración de la base de datos

Ejecutar la migración SQL en Supabase:
1. Ir a **SQL Editor** en el dashboard de Supabase
2. Copiar y ejecutar el contenido de `supabase/migrations/001_initial_schema.sql`

## Deploy en Vercel

### Pasos para deploy

1. **Conectar repositorio**: Ir a [vercel.com/new](https://vercel.com/new) e importar el repositorio de GitHub.

2. **Configurar variables de entorno**: En el panel de Vercel, antes de hacer deploy:
   - Ir a **Settings → Environment Variables**
   - Agregar cada variable:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `GEMINI_API_KEY` | Tu API key de Gemini | Production, Preview |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://tu-proyecto.supabase.co` | Production, Preview |
   | `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key | Production, Preview |

3. **Deploy**: Hacer clic en "Deploy". Vercel detecta automáticamente que es un proyecto Next.js.

### Configuración en el dashboard de Vercel

1. Ir a tu proyecto en [vercel.com/dashboard](https://vercel.com/dashboard)
2. Navegar a **Settings → Environment Variables**
3. Para cada variable:
   - Escribir el **Name** (nombre exacto de la variable)
   - Pegar el **Value** (valor)
   - Seleccionar los entornos: **Production** y **Preview**
   - Hacer clic en **Save**
4. Si ya hiciste deploy, ir a **Deployments** y hacer **Redeploy** para que tome los nuevos valores.

### Notas importantes

- Las variables `NEXT_PUBLIC_*` se incluyen en el bundle del cliente (son públicas).
- Las variables sin prefijo `NEXT_PUBLIC_` solo están disponibles en el servidor (API routes).
- Después de cambiar variables, es necesario hacer un nuevo deploy o redeploy.
- El proyecto funciona completamente en el **free tier** de Vercel (sin configuración adicional de build).

## Estructura del proyecto

```
src/
├── app/
│   ├── page.js                # Login/Registro
│   ├── chat/page.js           # Chat con el tutor IA
│   ├── ejercicios/page.js     # Ejercicios paso a paso
│   ├── progreso/page.js       # Dashboard de progreso
│   ├── evaluacion/page.js     # Modo evaluación
│   └── api/                   # API Routes (server-side)
├── components/                # Componentes React
└── lib/                       # Utilidades (Gemini, Supabase, prompts)
```

## Funcionalidades principales

- Chat conversacional adaptado a discalculia
- Ejercicios paso a paso con carrusel swipe
- Evaluaciones de opción múltiple por tema
- Subida de material (PDF, fotos, texto)
- Progreso por temas con niveles
- PWA instalable en celular
- Guía de SPSS integrada
