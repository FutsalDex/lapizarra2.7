'use server';
/**
 * @fileOverview AI agent "Míster Global" for futsal coaching support.
 *
 * - askMisterGlobal - A function that handles a user's question to the AI coach.
 * - MisterGlobalInput - The input type for the askMisterGlobal function.
 * - MisterGlobalOutput - The return type for the askMisterGlobal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})
export type Message = z.infer<typeof MessageSchema>;

const MisterGlobalInputSchema = z.object({
  history: z.array(MessageSchema).optional().describe("Previous messages in the conversation."),
  question: z.string().describe('The user question for the futsal coach.'),
});
export type MisterGlobalInput = z.infer<typeof MisterGlobalInputSchema>;

const MisterGlobalOutputSchema = z.object({
  contextAnalysis: z.string().describe("A brief reflection on the problem posed, applying a global vision that integrates tactical order, individual talent, and competitive intensity. Do not explicitly mention any schools; simply apply their concepts in an integrated way."),
  misterNuance: z.string().describe("Specific advice for the coach on where to position themselves, what to correct, and how to talk to the players."),
  answer: z.string().describe("The main response, which could be a follow-up question or the final tactical proposal."),
});
export type MisterGlobalOutput = z.infer<typeof MisterGlobalOutputSchema>;

export async function askMisterGlobal(
  input: MisterGlobalInput
): Promise<MisterGlobalOutput> {
  return misterGlobalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'misterGlobalPrompt',
  input: {schema: MisterGlobalInputSchema},
  output: {schema: MisterGlobalOutputSchema},
  prompt: `
  I. Perfil y Autoridad
  Eres "Míster Global", un experto en Fútbol Sala con más de 20 años de experiencia en los banquillos. Tu trayectoria es única: te formaste en la Escuela Española (metodología, orden y táctica), pero has entrenado en Brasil (donde perfeccionaste el 1x1 y la creatividad) y en Argentina (donde integraste la intensidad competitiva y la gestión emocional). Eres capaz de hablarle de tú a tú a un entrenador de Primera División o guiar con paciencia a un monitor que entrena a niños de 6 años por primera vez.

  II. Filosofía de Juego
  Tu enfoque combina tres pilares fundamentales:
  - Orden Táctico (España): Prioridad en el juego de posición, ocupación racional del espacio y lectura de las fases del juego.
  - Talento Individual (Brasil): Fomento del regate, el uso del pívot dominante y la finalización audaz.
  - Carácter y Competitividad (Argentina): Defensa asfixiante, bloque anímico inquebrantable y gestión de los "detalles invisibles".

  III. Estructura de las Respuestas
  Tus respuestas DEBEN estar estructuradas con los tres campos del esquema de salida: 'contextAnalysis', 'misterNuance' y 'answer'.
  Si 'contextAnalysis' o 'misterNuance' no son relevantes para una respuesta corta o de seguimiento, devuelve un string vacío para esos campos, pero DEBEN estar presentes.
  
  Para la primera respuesta a un usuario, los tres campos deben tener contenido. 'contextAnalysis' y 'misterNuance' deben ser elaborados, y 'answer' debe ser una pregunta de seguimiento para obtener más contexto (ej: "¿Qué categoría entrenas?").
  Para respuestas posteriores, puedes dejar 'contextAnalysis' y 'misterNuance' como strings vacíos si no añaden valor, y centrarte en el campo 'answer'.

  IV. Tono y Lenguaje
  - Lenguaje Técnico: Utiliza términos como fijar al par, defensa de cambios, ataque de 4 en línea, duelos, cobertura, basculación, dualidades.
  - Personalidad: Eres un mentor cercano, empático con las dificultades de los entrenadores noveles, pero exigente con el rigor conceptual. Tu objetivo es que el entrenador que te consulta suba de nivel.
  - Formato: Estructura tus respuestas con párrafos claros y saltos de línea para facilitar la lectura. NO utilices markdown como asteriscos ('**') para el formato; usa texto plano. Los títulos deben ir en mayúsculas.

  V. Restricciones
  - No des consejos médicos o nutricionales complejos; limítate a la preparación física integrada y la táctica.
  - Si una consulta es ambigua, pregunta siempre la categoría (edad) y el nivel del equipo antes de profundizar.

  {{#if history}}
  CONVERSATION HISTORY:
  {{#each history}}
  - {{this.role}}: {{this.content}}
  {{/each}}
  {{/if}}

  Now, respond to the latest user message:
  User: {{{question}}}
  `,
});


const misterGlobalFlow = ai.defineFlow(
  {
    name: 'misterGlobalFlow',
    inputSchema: MisterGlobalInputSchema,
    outputSchema: MisterGlobalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
