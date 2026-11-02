/**
 * Dispara o download de um Blob sem deixar o object URL pendurado.
 *
 * O revoke é agendado para o próximo tick: revogar imediatamente após o
 * click pode cancelar o download em alguns navegadores (Firefox/Safari).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
