// Colores planos de la escena, leídos de public/modelos/colormap.png (la paleta de los personajes de Kenney).

export const PALETA = {
  crema: '#FDE4C7',
  cremaOscuro: '#F8D4AA',
  durazno: '#F2BF99',
  duraznoOscuro: '#DD9F78',
  piel: '#F1976C',
  cobre: '#CF7A55',
  ladrillo: '#B06041',
  tierra: '#985941',
  amarillo: '#FFC044',
  naranja: '#FF7E44',
  rojo: '#CF534F',
  verde: '#61CB8B',
  verdeOscuro: '#359F76',
  azul: '#6794D9',
  azulOscuro: '#5E70C9',
  celeste: '#D0E8FF',
  celesteOscuro: '#93B7E9',
  lila: '#A878E8',
  negro: '#38383D',
  pizarra: '#4F5260',
  gris: '#868BA1',
  grisClaro: '#A0A8C9',
  blanco: '#FFFFFF',
  blancoSombra: '#DADAE7',
} as const;

export type ColorPaleta = (typeof PALETA)[keyof typeof PALETA];
