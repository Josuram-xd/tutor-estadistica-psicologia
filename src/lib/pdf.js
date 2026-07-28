import { PDFParse } from 'pdf-parse';

const MAX_TEXT_LENGTH = 15000;

/**
 * Extrae texto de un buffer PDF usando pdf-parse v2.
 * Trunca el resultado a 15,000 caracteres máximo.
 *
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @returns {Promise<string>} Texto extraído (truncado si excede el límite)
 * @throws {Error} Si el buffer no es un PDF válido o no se puede procesar
 */
export async function extractTextFromPDF(pdfBuffer) {
  try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('El buffer del PDF está vacío');
    }

    const parser = new PDFParse({ data: pdfBuffer, verbosity: 0 });
    const result = await parser.getText();
    const text = result.text || '';

    if (text.length > MAX_TEXT_LENGTH) {
      return text.slice(0, MAX_TEXT_LENGTH);
    }

    return text;
  } catch (error) {
    if (error.message === 'El buffer del PDF está vacío') {
      throw error;
    }
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}
