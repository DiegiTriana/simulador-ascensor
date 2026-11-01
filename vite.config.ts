import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Nombre del repositorio de GitHub (el enlace publicado es https://USUARIO.github.io/NOMBRE_REPO/).
 * Provisional: es lo único que se cambia aquí al publicar (ver docs/publicar.md).
 */
const NOMBRE_REPO = 'simulador-ascensor';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // En desarrollo (npm run dev) la página va en la raíz; el build y `vite preview` usan la ruta del repositorio.
  base: mode === 'development' ? '/' : `/${NOMBRE_REPO}/`,
  test: { include: ['src/**/*.test.ts'] },
}));
