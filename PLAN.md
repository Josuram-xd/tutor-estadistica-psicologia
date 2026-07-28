# Plan de Implementación — Tutor IA de Estadística Inferencial (Psicología + Discalculia)

## Repositorio
https://github.com/Josuram-xd/tutor-estadistica-psicologia.git

## Servicios ya configurados
- [x] API Key de Gemini (Google AI Studio)
- [x] Proyecto en Supabase (free tier)
- [x] Cuenta en Vercel vinculada al repo
- [x] Repositorio de GitHub creado

---

## Problem Statement

Crear una app web móvil gratuita que actúe como tutor personalizado de estadística inferencial para psicología, adaptado a discalculia, con memoria persistente, progreso por niveles, ejercicios interactivos con swipe, soporte para subir materiales (PDF/foto/texto), y guía de SPSS.

---

## Decisiones Técnicas

| Aspecto | Decisión |
|---|---|
| Framework UI | Next.js 14 (App Router) + JavaScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes |
| Modelo IA | Gemini 2.5 Flash (Google AI) |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Nombre + contraseña simple (sin email) |
| OCR | Gemini (enviar imagen como input) |
| PDF parsing | pdf-parse (server-side) |
| Deploy | Vercel (free tier) |
| PWA | next-pwa |
| Ejercicios | Carrusel swipe (CSS scroll-snap o Swiper ligero) |
| Diseño | Mobile-first, uso principal en celular |
| Costo total | $0 |

---

## Requisitos Funcionales

- Chat conversacional con Gemini Flash adaptado a discalculia
- Memoria persistente entre sesiones (Supabase)
- Auth simple (nombre + contraseña, sin email)
- Progreso por temas con niveles (no_visto/básico/intermedio/avanzado)
- Ejercicios paso a paso con carrusel swipe
- Opción de saltar cálculos e ir directo a interpretación
- Modo evaluación/prueba para medir y repasar dominio
- Subida de material: PDF, foto (OCR vía Gemini), copiar/pegar texto
- Guía de uso de SPSS cuando sea relevante
- Dashboard de progreso visual
- Botón "Explícamelo de otra forma"
- PWA instalable en celular

---

## Requisitos No Funcionales

- Código optimizado y ligero
- Mobile-first responsive
- Fuente mínimo 16px, alto contraste, espaciado generoso
- Nunca pedir cálculos mentales a la usuaria
- Bajo ruido visual (importante para discalculia)
- Tiempos de respuesta razonables

---

## Arquitectura

```
[📱 Celular - PWA]
        │
        ▼
[Next.js Frontend - React]
        │
        ▼
[Next.js API Routes]
        │
        ├──► [Gemini API] (chat, OCR de fotos, generar ejercicios/evaluaciones)
        │
        ├──► [Supabase]
        │       ├── Auth (users: nombre + contraseña)
        │       ├── Historial de chats (conversations)
        │       └── Progreso por tema (progress)
        │
        └──► [pdf-parse] (extracción de texto de PDFs)
```

---

## Estructura de Carpetas

```
tutor-estadistica-psicologia/
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js                # Login/Registro
│   │   ├── chat/
│   │   │   └── page.js            # Chat principal
│   │   ├── ejercicios/
│   │   │   └── page.js            # Ejercicios con swipe
│   │   ├── progreso/
│   │   │   └── page.js            # Dashboard de progreso
│   │   ├── evaluacion/
│   │   │   └── page.js            # Modo prueba
│   │   └── api/
│   │       ├── auth/route.js
│   │       ├── chat/route.js
│   │       ├── upload/route.js
│   │       ├── progress/route.js
│   │       └── eval/route.js
│   ├── components/
│   │   ├── ChatBubble.jsx
│   │   ├── SwipeCarousel.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── FileUpload.jsx
│   │   └── Navigation.jsx
│   ├── lib/
│   │   ├── gemini.js
│   │   ├── supabase.js
│   │   ├── prompts.js
│   │   └── pdf.js
│   └── styles/
│       └── globals.css
├── public/
│   ├── manifest.json
│   └── icons/
├── next.config.js
├── tailwind.config.js
├── jsconfig.json
├── package.json
├── .env.local
├── .gitignore
├── PLAN.md
└── README.md
```

---

## Schema de Supabase (ejecutar en SQL Editor)

```sql
-- Tabla de usuarios
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de conversaciones
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  material_context TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de progreso por tema
CREATE TABLE progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  level TEXT DEFAULT 'no_visto' CHECK (level IN ('no_visto', 'basico', 'intermedio', 'avanzado')),
  exercises_completed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Policies (permitir acceso desde service role en API routes)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON conversations FOR ALL USING (true);
CREATE POLICY "Service role full access" ON progress FOR ALL USING (true);
```

---

## System Prompt del Tutor

```
Eres un tutor de IA especializado en Estadística Inferencial aplicada a Psicología.
Tu estudiante tiene discalculia. Reglas estrictas:

1. ENFOQUE CONCEPTUAL: Prioriza interpretación sobre cálculo (qué implica un p-valor
   de 0.03 sobre la efectividad de una terapia).

2. CERO CARGA NUMÉRICA: Nunca pidas cálculo mental. Tú resuelves, ella interpreta.

3. RITMO: Máximo 2 párrafos cortos. Luego UNA pregunta de comprensión. No avances
   varios temas a la vez.

4. FORMATO: Tablas o listas, no bloques de números sueltos. Si hay fórmulas, explica
   cada símbolo con palabras simples primero.

5. TONO: Paciente, cercano, sin juzgar errores. Si se equivoca, da pista antes de
   dar la respuesta correcta.

6. CONTEXTO PSICOLÓGICO: Ejemplos siempre de psicología (ansiedad, depresión,
   terapias, rendimiento académico, estrés laboral).

7. SPSS: Cuando sea relevante, explica cómo hacer el análisis en SPSS paso a paso
   con capturas mentales del menú (Analizar > Comparar medias > Prueba T...).

8. MATERIAL: Si hay texto de PDF/apuntes, úsalo como base ("Según tu material...").

9. NIVEL ADAPTATIVO: Ajusta complejidad según el nivel del estudiante en cada tema.
   Nivel actual del estudiante: {user_level}
   Temas ya vistos: {topics_seen}
```

---

## Tasks de Implementación

### Task 1: Scaffold del proyecto y configuración base

**Objetivo**: Crear el proyecto Next.js con dependencias y configuración completa.

**Implementación**:

- Inicializar Next.js 14 con App Router, JavaScript, Tailwind CSS
- Instalar dependencias: `@google/generative-ai`, `@supabase/supabase-js`, `pdf-parse`, `next-pwa`, `bcryptjs`
- Configurar shadcn/ui (init + agregar componentes: button, input, card, dialog)
- Crear `.env.local` con: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Configurar `next.config.js` con PWA
- Crear `.gitignore` (incluir .env.local, node_modules, .next)
- Configurar `tailwind.config.js` mobile-first (breakpoints, font-size base 16px)

**Test**: `npm run dev` arranca sin errores, página default visible.

---

### Task 2: Setup de Supabase (schema + conexión)

**Objetivo**: Tablas creadas en Supabase y conexión verificada desde la app.

**Implementación**:

- Ejecutar SQL del schema (users, conversations, progress) en Supabase SQL Editor
- Configurar RLS policies
- Crear `src/lib/supabase.js` — cliente con service role key (server-side)
- Test de conexión: insert y select de prueba desde un API route temporal

**Test**: Hacer fetch al API route de prueba → devuelve datos de Supabase.

---

### Task 3: Sistema de auth (nombre + contraseña)

**Objetivo**: Login y registro funcional, sesión persistente.

**Implementación**:

- `src/app/page.js` — formulario login/registro con tabs, mobile-first
- `src/app/api/auth/route.js` — POST con action: "register" o "login"
  - Registro: hashear con bcryptjs, insertar en users
  - Login: verificar hash, devolver user_id
- Guardar user_id en localStorage (o cookie)
- Middleware o check en layout para redirect si no autenticado
- UI: inputs grandes, botones claros, colores suaves, sin ruido

**Test**: Registrar → cerrar pestaña → reabrir → login → accede al chat.

---

### Task 4: Navegación mobile y layout

**Objetivo**: Navegación inferior tipo app nativa entre las 4 secciones.

**Implementación**:

- `src/components/Navigation.jsx` — barra inferior fija con iconos: 💬 Chat | 📝 Ejercicios | 📊 Progreso | 📋 Evaluación
- `src/app/layout.js` — layout que incluya nav en todas las rutas (excepto login)
- Highlight del tab activo
- Safe area para móviles con notch
- Transiciones CSS suaves entre páginas
- Colores suaves, tipografía clara, sin distracciones

**Test**: Navegar entre las 4 secciones en viewport móvil sin errores.

---

### Task 5: Integración con Gemini API

**Objetivo**: Módulo backend de comunicación con Gemini listo y testeado.

**Implementación**:

- `src/lib/gemini.js` — inicializar cliente, función `generateResponse(systemPrompt, history, userMessage, context)`
- `src/lib/prompts.js` — system prompt del tutor + prompt para ejercicios + prompt para evaluación
- `src/app/api/chat/route.js`:
  - Recibe: { message, userId, conversationId }
  - Carga historial de Supabase
  - Carga progreso del usuario para inyectar nivel en el prompt
  - Llama a Gemini con prompt armado
  - Guarda respuesta en Supabase
  - Devuelve respuesta
- Manejo de errores con mensajes amigables

**Test**: POST `/api/chat` con mensaje → respuesta coherente con tono del tutor.

---

### Task 6: Chat UI funcional con persistencia

**Objetivo**: Interfaz de chat completa, persistente, optimizada para móvil.

**Implementación**:

- `src/app/chat/page.js` — vista principal del chat
- `src/components/ChatBubble.jsx` — burbujas diferenciadas (colores distintos user/tutor)
- Input fijo en parte inferior con botón enviar
- Auto-scroll al último mensaje
- Indicador "escribiendo..." mientras Gemini responde
- Cargar historial de Supabase al montar el componente
- Guardar cada mensaje nuevo en Supabase
- Botón "Explícamelo de otra forma" debajo de cada respuesta del tutor
- Diseño: burbujas redondeadas, padding generoso, texto 16px, colores suaves

**Test**: Enviar 5 mensajes → cerrar app → reabrir → historial completo visible.

---

### Task 7: Subida de material (PDF + foto + texto)

**Objetivo**: 3 formas de subir material como contexto para el tutor.

**Implementación**:

- `src/components/FileUpload.jsx` — modal/sheet con 3 opciones:
  1. Subir PDF: input file accept=".pdf" → enviar a API
  2. Tomar/subir foto: input file accept="image/*" capture="environment" → enviar a Gemini para OCR
  3. Pegar texto: textarea donde pega texto directamente
- `src/lib/pdf.js` — función para extraer texto con pdf-parse
- `src/app/api/upload/route.js`:
  - PDF: extrae texto con pdf-parse, trunca a 15,000 chars
  - Imagen: convierte a base64, envía a Gemini con prompt "Extrae el texto de esta imagen"
  - Texto: lo toma directo
  - Guarda el contexto extraído en la conversación (Supabase)
- Botón de clip/adjuntar en el input del chat
- Indicador visual de "Material cargado ✓"

**Test**: Subir PDF → preguntar sobre el tema → tutor responde basándose en el material.

---

### Task 8: Ejercicios con carrusel swipe

**Objetivo**: Ejercicios paso a paso navegables con swipe táctil.

**Implementación**:

- `src/app/ejercicios/page.js` — vista de ejercicios
- `src/components/SwipeCarousel.jsx` — carrusel con CSS scroll-snap
- Botón "Generar ejercicio" → llama a Gemini con prompt de ejercicio
- Estructura de slides:
  1. Slide 1: Contexto del caso psicológico
  2. Slides 2-N: Pasos del cálculo explicados
  3. Slide N+1: Pregunta de interpretación + input para responder
  4. Slide final: Feedback del tutor sobre su respuesta
- Botón flotante "Saltar a interpretación"
- Indicadores de progreso (dots) abajo del carrusel
- Guardar resultado en Supabase (progress table)
- Selector de tema arriba: dropdown con los 7 temas

**Test**: Generar ejercicio → navegar slides con swipe → responder → feedback correcto.

---

### Task 9: Sistema de progreso y niveles

**Objetivo**: Trackeo automático del dominio por tema con dashboard visual.

**Implementación**:

- Temas del curso:
  1. Probabilidad y distribuciones
  2. Hipótesis estadísticas
  3. Prueba t-Student
  4. ANOVA
  5. Chi-cuadrada
  6. Correlación
  7. Regresión
- Niveles: no_visto → básico → intermedio → avanzado
- `src/app/api/progress/route.js`:
  - GET: devuelve progreso completo del usuario
  - POST: actualiza después de ejercicios/evaluaciones
- Lógica de nivel:
  - básico: ≥2 ejercicios completados
  - intermedio: ≥5 ejercicios, ≥60% aciertos
  - avanzado: ≥10 ejercicios, ≥80% aciertos
- `src/app/progreso/page.js` — dashboard con cards por tema
- `src/components/ProgressBar.jsx` — barra visual con color según nivel
- El progreso se inyecta en el system prompt para que Gemini adapte dificultad

**Test**: Completar 3 ejercicios → nivel sube a básico → dashboard lo muestra.

---

### Task 10: Modo evaluación/prueba

**Objetivo**: Pruebas formales para medir y repasar dominio.

**Implementación**:

- `src/app/evaluacion/page.js`:
  - Selector de tema (o "evaluación general" mezclando temas)
  - Botón "Empezar prueba"
- `src/app/api/eval/route.js`:
  - Genera 5 preguntas vía Gemini (opción múltiple, 4 alternativas)
  - Formato JSON estructurado
- Flujo:
  1. Pregunta + 4 opciones (botones grandes, mobile-friendly)
  2. Al seleccionar → feedback inmediato
  3. Siguiente pregunta
  4. Al final: resumen (X/5 correctas) + recomendación
- Actualizar progreso en Supabase
- Opción de "Repasar" que abre el chat con el tema donde falló

**Test**: Tomar prueba → 4/5 correctas → nivel sube → dashboard actualizado.

---

### Task 11: PWA + optimización mobile

**Objetivo**: App instalable en celular, optimizada y rápida.

**Implementación**:

- `public/manifest.json`: name, short_name, icons, theme_color, background_color, display: "standalone"
- Iconos PWA (192x192 y 512x512)
- Configurar next-pwa en next.config.js
- Meta tags en layout: viewport, theme-color, apple-mobile-web-app-capable
- Service worker para cache de assets estáticos
- Optimización de bundle: dynamic imports, lazy loading
- Testear con Lighthouse

**Test**: Abrir en celular → "Agregar a pantalla de inicio" → instalar → funciona como app.

---

### Task 12: Refinamiento UX para discalculia + deploy final

**Objetivo**: Pulir accesibilidad, UX para discalculia, y deploy a producción.

**Implementación**:

- Revisión de UX:
  - Confirmar que NUNCA se piden cálculos mentales
  - Fuente legible ≥16px en todo lugar
  - Alto contraste (ratio ≥4.5:1)
  - Espaciado generoso (min 44px touch targets)
  - Sin animaciones rápidas o distractoras
  - Colores consistentes y suaves
- Botón "Explícamelo de otra forma" verificado en todos los contextos
- Deploy en Vercel:
  - Push código a GitHub
  - Configurar Environment Variables en Vercel dashboard
  - Verificar URL pública funciona
- Test final en celular real

**Test**: Recorrer todos los flujos verificando accesibilidad y claridad.

---

## Variables de Entorno (.env.local)

```
GEMINI_API_KEY=tu-api-key-de-google-ai-studio
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

---

## Notas para el agente de ejecución

- Stack: Next.js 14 + JavaScript + Tailwind + shadcn/ui + Gemini + Supabase
- Restricción: CERO costo, todo en free tier
- Restricción pedagógica: discalculia → nunca cálculo mental, solo interpretación
- Mobile-first: todo debe verse bien en pantalla de celular primero
- Mantener `src/lib/prompts.js` separado para iterar rápido sin tocar lógica
- Código ligero y optimizado: evitar librerías pesadas innecesarias
- Usar CSS scroll-snap para el carrusel (no Swiper.js completo) si es posible
- Cada task debe terminar con algo funcional y demoable
