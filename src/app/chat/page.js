'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatBubble from '@/components/ChatBubble';

const FileUpload = dynamic(() => import('@/components/FileUpload'), {
  ssr: false,
  loading: () => null,
});

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-slow-spin" />
          <p className="text-base text-gray-500">Cargando chat...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [materialContext, setMaterialContext] = useState(false); // true when conversation has active material_context

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const temaAutoSentRef = useRef(false);

  // Auto-scroll al último mensaje
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Cargar userId y conversación al montar
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (!storedUserId) {
      // Si no hay usuario, redirigir al login
      window.location.href = '/';
      return;
    }
    setUserId(storedUserId);
    loadConversation(storedUserId);
  }, []);

  // Cargar historial de mensajes de Supabase
  async function loadConversation(uid) {
    try {
      const res = await fetch(`/api/conversations?userId=${uid}`);
      const data = await res.json();

      if (data.conversation) {
        setConversationId(data.conversation.id);
        if (data.conversation.messages?.length > 0) {
          setMessages(data.conversation.messages);
        }
        // Track whether conversation has active material context
        if (data.conversation.material_context) {
          setMaterialContext(true);
        }
      } else {
        // No hay conversación, crear una nueva automáticamente
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid }),
        });

        if (createRes.ok) {
          const createData = await createRes.json();
          setConversationId(createData.conversation.id);
        } else {
          console.error('Error al crear conversación nueva');
        }
      }
    } catch (error) {
      console.error('Error al cargar conversación:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  // Auto-enviar mensaje de repaso si viene del modo evaluación con ?tema=X
  useEffect(() => {
    const tema = searchParams.get('tema');
    if (!tema || temaAutoSentRef.current) return;
    if (!conversationId || !userId || initialLoading) return;

    temaAutoSentRef.current = true;

    const autoMessage = `Quiero repasar el tema de ${tema}. Acabo de hacer una evaluación y tuve dificultades. ¿Puedes ayudarme a entender mejor los conceptos clave?`;
    sendMessage(autoMessage);

    // Limpiar el query param para que no se re-envíe al refrescar
    router.replace('/chat');
  }, [conversationId, userId, initialLoading, searchParams, router]);

  // Enviar mensaje
  async function sendMessage(text) {
    if (!text.trim() || isLoading || !userId) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          userId,
          conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Mostrar error como mensaje del tutor
        const errorMessage = {
          role: 'assistant',
          content: data.error || 'Ocurrió un error. Por favor intenta de nuevo.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      // Guardar conversationId si es nueva
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  // Manejar submit del formulario
  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(inputText);
  }

  // Manejar "Explícamelo de otra forma"
  function handleExplainDifferently(messageIndex) {
    const originalMessage = messages[messageIndex]?.content;
    if (!originalMessage) return;

    const request = 'Explícamelo de otra forma, usa una analogía diferente o un ejemplo más simple.';
    sendMessage(request);
  }

  // Manejar Enter para enviar (sin shift)
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  // Manejar subida de material desde FileUpload
  async function handleFileUpload({ type, content }) {
    if (!conversationId || !userId) return;

    setUploadStatus('uploading');

    try {
      let res;

      if (type === 'pdf') {
        // PDF se envía como FormData
        const formData = new FormData();
        formData.append('file', content);
        formData.append('conversationId', conversationId);
        formData.append('userId', userId);

        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Photo (base64) o texto directo se envían como JSON
        const body = {
          type,
          conversationId,
          userId,
        };

        if (type === 'photo') {
          body.imageBase64 = content;
        } else if (type === 'text') {
          body.text = content;
        }

        res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        setUploadStatus('success');
        setMaterialContext(true);
        // Limpiar indicador temporal después de 3 segundos
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        const data = await res.json();
        console.error('Error en upload:', data.error);
        setUploadStatus('error');
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error al subir material:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(null), 3000);
    }
  }

  // Pantalla de carga inicial
  if (initialLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-slow-spin" />
          <p className="text-base text-gray-500">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-mobile mx-auto">
      {/* Área de mensajes */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 pt-4 pb-24"
      >
        {/* Indicador persistente de material cargado */}
        {materialContext && (
          <div
            className="flex items-center justify-center mb-3"
            role="status"
            aria-label="Material de estudio cargado en la conversación"
          >
            <span className="
              inline-flex items-center gap-1.5
              px-3 py-1.5
              bg-accent-50 border border-accent-100
              rounded-full
              text-base text-accent-900 font-medium
            ">
              <span aria-hidden="true">📎</span>
              Material cargado
            </span>
          </div>
        )}
        {/* Mensaje de bienvenida si no hay historial */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <span className="text-4xl mb-4" aria-hidden="true">🎓</span>
            <h2 className="text-xl font-semibold text-primary-700 mb-2">
              ¡Hola! Soy tu tutor de estadística
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
              Pregúntame cualquier cosa sobre estadística inferencial. 
              Te explico con calma, usando ejemplos de psicología y sin pedirte cálculos mentales.
            </p>
          </div>
        )}

        {/* Lista de mensajes */}
        {messages.map((msg, index) => (
          <ChatBubble
            key={`${msg.timestamp}-${index}`}
            role={msg.role}
            content={msg.content}
            onExplainDifferently={
              msg.role === 'assistant'
                ? () => handleExplainDifferently(index)
                : undefined
            }
          />
        ))}

        {/* Indicador de escritura (typing) */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-accent-50 border border-accent-100 rounded-3xl rounded-bl-xl px-5 py-4">
              <div className="flex items-center gap-2" aria-label="El tutor está escribiendo">
                <span className="w-2.5 h-2.5 bg-accent-400 rounded-full animate-gentle-pulse" />
                <span className="w-2.5 h-2.5 bg-accent-400 rounded-full animate-gentle-pulse [animation-delay:400ms]" />
                <span className="w-2.5 h-2.5 bg-accent-400 rounded-full animate-gentle-pulse [animation-delay:800ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Ref para auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input fijo en la parte inferior, above navigation bar */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe-bottom">
        {/* Upload status indicator */}
        {uploadStatus && (
          <div className={`
            px-3 py-1.5 text-center text-base font-medium
            ${uploadStatus === 'uploading' ? 'bg-primary-50 text-primary-700' : ''}
            ${uploadStatus === 'success' ? 'bg-accent-50 text-accent-800' : ''}
            ${uploadStatus === 'error' ? 'bg-red-50 text-red-700' : ''}
          `}>
            {uploadStatus === 'uploading' && '📎 Subiendo material...'}
            {uploadStatus === 'success' && '✓ Material cargado correctamente'}
            {uploadStatus === 'error' && '✗ Error al subir material'}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 px-3 py-2 max-w-mobile mx-auto"
        >
          {/* Botón de adjuntar (clip) */}
          <button
            type="button"
            onClick={() => setShowFileUpload(true)}
            className="
              flex items-center justify-center
              w-11 h-11
              min-h-touch min-w-touch
              rounded-full
              bg-gray-100 hover:bg-gray-200
              text-gray-600
              transition-colors duration-200
              shrink-0
            "
            aria-label="Adjuntar material de estudio"
            disabled={isLoading || uploadStatus === 'uploading'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835a2.25 2.25 0 0 1-3.182-3.182l.002-.002L16.585 4.984a.75.75 0 0 1 1.06 1.06L6.98 16.71a.75.75 0 0 0 1.06 1.06L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            rows={1}
            className="
              flex-1
              resize-none
              rounded-2xl
              border border-gray-300
              bg-gray-50
              px-4 py-3
              text-base
              placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
              transition-colors
              max-h-32
              min-h-touch
            "
            style={{ fontSize: '16px' }}
            aria-label="Escribe tu mensaje al tutor"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="
              flex items-center justify-center
              w-11 h-11
              min-h-touch min-w-touch
              rounded-full
              bg-primary-600 hover:bg-primary-700
              disabled:bg-gray-300 disabled:cursor-not-allowed
              text-white
              transition-colors duration-200
              shrink-0
            "
            aria-label="Enviar mensaje"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>

      {/* FileUpload bottom-sheet modal */}
      <FileUpload
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUpload={handleFileUpload}
      />
    </div>
  );
}
