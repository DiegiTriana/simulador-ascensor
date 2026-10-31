import { Fragment } from 'react';

/** Escribe «P_K» como P con subíndice K. El resto del texto queda igual. */
export function ConSubindice({ texto }: { texto: string }) {
  return (
    <>
      {texto.split('P_K').map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <>
              P<sub>K</sub>
            </>
          )}
          {parte}
        </Fragment>
      ))}
    </>
  );
}
