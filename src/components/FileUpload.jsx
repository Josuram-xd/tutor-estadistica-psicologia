'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * FileUpload — Modal bottom-sheet para subir material de estudio.
 * 
 * Tres opciones:
 *   📄 PDF → archivo .pdf para extracción de texto via pdf-parse
 *   📷 Foto → imagen para OCR via Gemini Vision (se envía como base64)
 *   📝 Texto → textarea para pegar texto directamente
 *
 * Diseño accesible (NFR-2):
 *   - Touch targets mínimo 44px
 *   - Texto mínimo 16px
 *   - Contraste ≥4.5:1
 *   - Sin animaciones rápidas/distractoras (ease-out 300ms)
 *   - Espaciado generoso
 *
 * Props:
 *   isOpen: boolean — controla visibilidad del modal
 *   onClose: function — cierra el modal
 *   onUpload: function({type, content}) — recibe el material subido
 *     type: 'pdf' | 'photo' | 'text'
 *     content: File (pdf), string base64 (photo), string (text)
 */

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FileUpload({ isOpen, onClose, onUpload }) {
  const [activeOption, setActiveOption] = useState(null); // 'pdf' | 'photo' | 'text' | null
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const pdfInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const modalRef = useRef(null);

  // Manejar animación de apertura/cierre
  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para que el CSS transition funcione
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Reset state al cerrar
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setActiveOption(null);
        setTextContent('');
        setError('');
      }, 300); // esperar a que termine la animación
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function handleClose() {
    setIsVisible(false);
    // Esperar a que termine la animación antes de llamar onClose
    setTimeout(() => {
      onClose();
    }, 300);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  // Validar tamaño de archivo
  function validateFileSize(file) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }
    setError('');
    return true;
  }

  // Manejar selección de PDF
  function handlePdfSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileSize(file)) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF válido.');
      return;
    }

    setError('');
    onUpload({ type: 'pdf', content: file });
    handleClose();
  }

  // Manejar selección de foto
  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileSize(file)) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida.');
      return;
    }

    setError('');

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      onUpload({ type: 'photo', content: base64 });
      handleClose();
    };
    reader.onerror = () => {
      setError('Error al leer la imagen. Intenta de nuevo.');
    };
    reader.readAsDataURL(file);
  }

  // Manejar envío de texto
  function handleTextSubmit() {
    const trimmed = textContent.trim();
    if (!trimmed) {
      setError('Por favor ingresa algún texto.');
      return;
    }

    setError('');
    onUpload({ type: 'text', content: trimmed });
    handleClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50
        flex items-end justify-center
        transition-colors duration-300 ease-out
        ${isVisible ? 'bg-black/40' : 'bg-transparent'}
      `}
      onClick={handleBackdropClick}
      aria-label="Modal de subida de material"
      role="dialog"
      aria-modal="true"
    >
      {/* Bottom sheet */}
      <div
        ref={modalRef}
        className={`
          w-full max-w-mobile
          max-h-[85vh]
          overflow-y-auto
          overscroll-contain
          bg-white
          rounded-t-3xl
          shadow-xl
          px-5 pt-5 pb-8
          transform transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle bar indicator */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            Subir material
          </h2>
          <button
            onClick={handleClose}
            className="
              flex items-center justify-center
              w-11 h-11
              min-h-touch min-w-touch
              rounded-full
              bg-gray-100 hover:bg-gray-200
              text-gray-600
              transition-colors duration-200
            "
            aria-label="Cerrar modal"
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
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-base text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Options (when no active selection) */}
        {!activeOption && (
          <div className="flex flex-col gap-3">
            {/* PDF option */}
            <button
              onClick={() => {
                setActiveOption('pdf');
                // Trigger file input after state updates
                setTimeout(() => pdfInputRef.current?.click(), 50);
              }}
              className="
                flex items-center gap-4
                w-full
                min-h-touch
                px-5 py-4
                bg-primary-50 hover:bg-primary-100
                border border-primary-200
                rounded-2xl
                text-base font-medium text-primary-800
                transition-colors duration-200
              "
              aria-label="Subir archivo PDF"
            >
              <span className="text-2xl" aria-hidden="true">📄</span>
              <div className="text-left">
                <span className="block text-base font-medium">PDF</span>
                <span className="block text-base text-primary-800">Sube un documento PDF</span>
              </div>
            </button>

            {/* Photo option */}
            <button
              onClick={() => {
                setActiveOption('photo');
                setTimeout(() => photoInputRef.current?.click(), 50);
              }}
              className="
                flex items-center gap-4
                w-full
                min-h-touch
                px-5 py-4
                bg-accent-50 hover:bg-accent-100
                border border-accent-200
                rounded-2xl
                text-base font-medium text-accent-800
                transition-colors duration-200
              "
              aria-label="Subir foto para OCR"
            >
              <span className="text-2xl" aria-hidden="true">📷</span>
              <div className="text-left">
                <span className="block text-base font-medium">Foto</span>
                <span className="block text-base text-accent-900">Toma una foto o sube una imagen</span>
              </div>
            </button>

            {/* Text option */}
            <button
              onClick={() => setActiveOption('text')}
              className="
                flex items-center gap-4
                w-full
                min-h-touch
                px-5 py-4
                bg-gray-50 hover:bg-gray-100
                border border-gray-200
                rounded-2xl
                text-base font-medium text-gray-800
                transition-colors duration-200
              "
              aria-label="Pegar texto como material"
            >
              <span className="text-2xl" aria-hidden="true">📝</span>
              <div className="text-left">
                <span className="block text-base font-medium">Texto</span>
                <span className="block text-base text-gray-600">Pega texto directamente</span>
              </div>
            </button>
          </div>
        )}

        {/* Text input view */}
        {activeOption === 'text' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setActiveOption(null)}
              className="
                self-start
                flex items-center gap-1
                text-base text-primary-600
                min-h-touch
                px-2
                transition-colors duration-200
                hover:text-primary-800
              "
              aria-label="Volver a opciones"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                  clipRule="evenodd"
                />
              </svg>
              Volver
            </button>

            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Pega aquí el texto de tu material de estudio..."
              rows={5}
              className="
                w-full
                rounded-2xl
                border border-gray-300
                bg-gray-50
                px-4 py-3
                text-base
                placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                transition-colors
                resize-none
              "
              style={{ fontSize: '16px' }}
              aria-label="Texto del material de estudio"
            />

            <button
              onClick={handleTextSubmit}
              disabled={!textContent.trim()}
              className="
                w-full
                min-h-touch
                px-5 py-3
                bg-primary-600 hover:bg-primary-700
                disabled:bg-gray-300 disabled:cursor-not-allowed
                text-white text-base font-medium
                rounded-2xl
                transition-colors duration-200
              "
              aria-label="Enviar texto como material"
            >
              Enviar texto
            </button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handlePdfSelect}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
