'use client';

import { formatMarkdown } from '@/lib/formatMarkdown';

/**
 * ChatBubble — burbujas de chat diferenciadas por rol.
 * Soporta markdown básico: **negritas**, *cursivas*, `código`
 */
export default function ChatBubble({ role, content, onExplainDifferently }) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className="max-w-[85%] flex flex-col">
        {/* Burbuja */}
        <div
          className={`
            px-5 py-4
            text-base leading-relaxed
            whitespace-pre-wrap break-words
            ${isUser
              ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-100 rounded-3xl rounded-br-xl'
              : 'bg-accent-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-3xl rounded-bl-xl border border-accent-100 dark:border-gray-700'
            }
          `}
          dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
        />

        {/* Botón "Explícamelo de otra forma" solo para respuestas del tutor */}
        {!isUser && onExplainDifferently && (
          <button
            onClick={onExplainDifferently}
            className="
              mt-2 self-start
              text-base text-accent-900 dark:text-accent-300
              bg-accent-50 dark:bg-gray-800 hover:bg-accent-100 dark:hover:bg-gray-700
              border border-accent-200 dark:border-gray-600
              rounded-2xl px-4 py-2.5
              transition-colors duration-200
              min-h-touch
            "
            aria-label="Explícamelo de otra forma"
          >
            🔄 Explícamelo de otra forma
          </button>
        )}
      </div>
    </div>
  );
}
