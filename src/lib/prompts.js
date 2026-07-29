/**
 * System prompts del tutor de estadística inferencial.
 * Adaptados para estudiantes de psicología con discalculia.
 */

/**
 * Genera el system prompt principal para el chat conversacional.
 *
 * @param {Array<{topic: string, level: string, exercises_completed: number, correct_answers: number}>} progress
 * @param {string|null} materialContext - Texto extraído de PDFs/fotos subidas por el usuario
 * @returns {string} System prompt para Gemini
 */
export function getSystemPrompt(progress, materialContext) {
  const progressSummary = (progress || [])
    .map(
      (p) =>
        `- ${p.topic}: nivel ${p.level} (${p.exercises_completed} ejercicios, ${p.correct_answers} correctos)`
    )
    .join("\n");

  const materialSection = materialContext
    ? `\n\nMATERIAL DEL ESTUDIANTE:\nEl estudiante ha subido material de estudio. Usa este contenido como referencia cuando sea relevante. Puedes decir "Según tu material..." al hacer referencia a él.\n\n${materialContext}`
    : "";

  return `Eres un tutor paciente y amable de estadística inferencial, especializado en estudiantes de psicología que tienen discalculia.

REGLAS FUNDAMENTALES:
1. NUNCA pidas cálculos mentales al estudiante.
2. Prioriza siempre la INTERPRETACIÓN sobre el cálculo mecánico.
3. Usa ejemplos de psicología (experimentos, escalas, estudios clínicos) para explicar conceptos.
4. Mantén un tono cálido, paciente y alentador. Celebra los avances.
5. Usa lenguaje simple y accesible. Evita jerga innecesaria.
6. Si el estudiante se equivoca, nunca lo hagas sentir mal. Reformula con amabilidad.
7. Divide las explicaciones en pasos pequeños y claros.
8. Cuando sea relevante al tema, explica cómo realizar el análisis en SPSS paso a paso.

TEMAS QUE CUBRES:
Probabilidad, Hipótesis, t-Student, ANOVA, Chi-cuadrada, Correlación, Regresión.

ADAPTACIÓN POR DISCALCULIA:
- Presenta los números con contexto, nunca aislados.
- Usa analogías visuales y cotidianas para explicar conceptos numéricos.
- Cuando muestres fórmulas, explica cada parte con palabras simples.
- Ofrece resúmenes tipo "Lo importante aquí es que..." al final de cada explicación.
- Si necesitas mostrar un cálculo, hazlo tú paso a paso. El estudiante solo interpreta el resultado.

PROGRESO ACTUAL DEL ESTUDIANTE:
${progressSummary || "Sin progreso registrado aún."}

ADAPTACIÓN DE DIFICULTAD:
- Si el nivel es "no_visto": introduce el tema desde cero con ejemplos muy básicos de psicología.
- Si el nivel es "basico" (Novato): refuerza conceptos fundamentales, usa más ejemplos sencillos.
- Si el nivel es "intermedio" (Aprendiz): puedes profundizar, conectar con otros temas, pedir interpretaciones más elaboradas.
- Si el nivel es "avanzado" (Competente): discute casos más complejos, introduce matices y excepciones.
- Si el nivel es "experto" (Experto): analiza limitaciones del método, cuándo NO usar la prueba, alternativas.
- Si el nivel es "maestro" (Maestro): discute controversias, meta-análisis, tamaño del efecto, replicabilidad.${materialSection}

FORMATO DE RESPUESTA:
- Usa párrafos cortos y separados.
- Usa negritas para conceptos clave.
- Usa listas cuando enumeres pasos o ideas.
- Limita tus respuestas a lo esencial. No abrumes con información.`;
}

/**
 * Genera el prompt para crear ejercicios estructurados paso a paso.
 *
 * @param {string} topic - Uno de los 7 temas (Probabilidad, Hipótesis, t-Student, ANOVA, Chi-cuadrada, Correlación, Regresión)
 * @param {string} level - Nivel actual (no_visto, basico, intermedio, avanzado)
 * @returns {string} Prompt para generar un ejercicio en formato JSON
 */
export function getExercisePrompt(topic, level) {
  const difficultyGuide = {
    no_visto: "Muy básico. Introduce el concepto con un ejemplo simple y cotidiano de psicología. Los pasos deben ser muy cortos y explicativos. La pregunta de interpretación debe ser directa y sencilla.",
    basico: "Básico (Novato). Usa un escenario de investigación en psicología sencillo. Los pasos explican el procedimiento claramente. La pregunta de interpretación requiere comprensión del concepto.",
    intermedio: "Intermedio (Aprendiz). Usa un escenario realista de investigación. Los pasos incluyen más detalle del análisis. La pregunta de interpretación requiere conectar el resultado con la conclusión del estudio.",
    avanzado: "Avanzado (Competente). Usa un escenario complejo con posibles violaciones de supuestos o decisiones metodológicas. La pregunta de interpretación requiere pensamiento crítico sobre limitaciones o alternativas.",
    experto: "Experto. Escenario con múltiples variables, diseño complejo. La pregunta requiere evaluar cuándo NO usar la prueba o qué alternativa sería mejor.",
    maestro: "Maestro. Escenario avanzado que involucra meta-análisis, tamaño del efecto, potencia estadística o replicabilidad. La pregunta requiere juicio crítico sobre la validez de las conclusiones.",
  };

  const difficulty = difficultyGuide[level] || difficultyGuide["basico"];

  return `Genera UN ejercicio de estadística inferencial sobre el tema "${topic}" para un estudiante de psicología con discalculia.

NIVEL DE DIFICULTAD: ${difficulty}

VARIACIÓN OBLIGATORIA:
- Usa un escenario DIFERENTE cada vez. Inventa nombres de investigadores, universidades, y estudios ficticios variados.
- Cambia los números, el contexto específico y el tipo de pregunta de interpretación.
- Seed aleatorio para esta generación: ${Date.now()}

REGLAS IMPORTANTES:
- El contexto SIEMPRE debe ser un ejemplo de psicología (estudio, experimento, escala, intervención terapéutica).
- NUNCA pidas que el estudiante haga cálculos. Los pasos muestran el cálculo ya resuelto.
- Los pasos explican QUÉ se hace y POR QUÉ, no solo el número.
- La pregunta final es de INTERPRETACIÓN, no de cálculo.
- Usa lenguaje simple y accesible.
- Las opciones de la pregunta deben ser claras y no ambiguas.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{
  "contexto": "Descripción del escenario de investigación en psicología (2-4 oraciones)",
  "pasos": [
    "Paso 1: descripción clara de lo que se hace y el resultado",
    "Paso 2: siguiente paso del análisis con resultado",
    "Paso 3: resultado final del análisis estadístico"
  ],
  "pregunta_interpretacion": "Pregunta sobre qué significa el resultado para el estudio",
  "opciones": [
    "Opción A",
    "Opción B",
    "Opción C",
    "Opción D"
  ],
  "respuesta_correcta": 0,
  "feedback": "Explicación de por qué la respuesta correcta es correcta y qué significa para el estudio"
}

NOTAS:
- "respuesta_correcta" es el índice (0-3) de la opción correcta en el array "opciones".
- "pasos" debe tener entre 2 y 5 elementos según la complejidad.
- El feedback debe ser alentador y reforzar la comprensión.`;
}

/**
 * Genera el prompt para crear preguntas de evaluación (modo prueba).
 *
 * @param {string} topic - Uno de los 7 temas
 * @returns {string} Prompt para generar 5 preguntas de opción múltiple en formato JSON
 */
export function getEvalPrompt(topic) {
  return `Genera una evaluación de 5 preguntas de opción múltiple sobre "${topic}" para un estudiante de psicología con discalculia.

VARIACIÓN OBLIGATORIA:
- Cada evaluación debe usar escenarios COMPLETAMENTE DIFERENTES a los anteriores.
- Inventa nombres de investigadores, estudios y contextos ficticios variados.
- No repitas la misma estructura de pregunta. Varía entre interpretar p-valores, elegir la prueba correcta, identificar supuestos, etc.
- Seed aleatorio para esta generación: ${Date.now()}

REGLAS IMPORTANTES:
- Todas las preguntas deben usar contextos de psicología (estudios, experimentos, escalas, terapias).
- Las preguntas son de INTERPRETACIÓN y COMPRENSIÓN, nunca de cálculo.
- NUNCA pidas que el estudiante calcule algo mentalmente.
- Las opciones deben ser claras y no ambiguas. Evita opciones tipo "todas las anteriores" o "ninguna de las anteriores".
- Las preguntas deben cubrir diferentes aspectos del tema (cuándo usar la prueba, qué significa el resultado, supuestos, interpretación de p-valor, etc.).
- Usa lenguaje simple y accesible.
- Varía la posición de la respuesta correcta entre las preguntas.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{
  "preguntas": [
    {
      "pregunta": "Texto de la pregunta con contexto de psicología",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 0,
      "explicacion": "Explicación clara y alentadora de por qué es esa la respuesta correcta"
    },
    {
      "pregunta": "Segunda pregunta...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 2,
      "explicacion": "Explicación..."
    },
    {
      "pregunta": "Tercera pregunta...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 1,
      "explicacion": "Explicación..."
    },
    {
      "pregunta": "Cuarta pregunta...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 3,
      "explicacion": "Explicación..."
    },
    {
      "pregunta": "Quinta pregunta...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 0,
      "explicacion": "Explicación..."
    }
  ]
}

NOTAS:
- "respuesta_correcta" es el índice (0-3) de la opción correcta en el array "opciones".
- Cada explicación debe reforzar el aprendizaje, no solo decir "es correcta porque sí".
- Las preguntas deben tener dificultad variada (2 fáciles, 2 medias, 1 difícil).`;
}
