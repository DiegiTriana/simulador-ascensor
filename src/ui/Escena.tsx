/** Marco de la escena. La escena 3D llega en la fase 5; mientras tanto, tres de los personajes en un fondo plano. */
const PERSONAJES = ['female-b', 'male-a', 'male-e'];

export function Escena() {
  return (
    <section className="escena" aria-label="Escena del ascensor (vista previa)">
      <span className="escena-etiqueta">Escena 3D en preparación</span>
      <div className="escena-personajes">
        {PERSONAJES.map((p) => (
          <img key={p} src={`${import.meta.env.BASE_URL}imagenes/previa-${p}.png`} alt="" width={360} height={360} decoding="async" />
        ))}
      </div>
    </section>
  );
}
