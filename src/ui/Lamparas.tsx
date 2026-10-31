interface Props {
  encendidas: number;
  total?: number;
  /** Pequeñas, para la barra del celular. */
  chicas?: boolean;
}

/** Una lámpara por corrida. Es decoración: el avance se anuncia con texto en otra parte. */
export function Lamparas({ encendidas, total = 10, chicas = false }: Props) {
  return (
    <span className={chicas ? 'lamparas lamparas-chicas' : 'lamparas'} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < encendidas ? 'lampara encendida' : 'lampara'} />
      ))}
    </span>
  );
}
