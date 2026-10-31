// Números con coma decimal, como se escriben en español.

const formatos = new Map<number, Intl.NumberFormat>();

/** Número con coma decimal (es-CO), con la cantidad de decimales pedida. */
export function coma(n: number, decimales = 1): string {
  let f = formatos.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    formatos.set(decimales, f);
  }
  return f.format(n);
}
