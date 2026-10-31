import { Fragment } from 'react';
import type { Simbolo as IdSimbolo } from './resultados.ts';

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

/** El símbolo de la leyenda, con sus subíndices (Lq, Wq, P_K, λef). */
export function Simbolo({ id }: { id: IdSimbolo['id'] }) {
  switch (id) {
    case 'lambda':
      return <>λ</>;
    case 'mu':
      return <>μ</>;
    case 'rho':
      return <>ρ</>;
    case 'Lq':
      return (
        <>
          L<sub>q</sub>
        </>
      );
    case 'Wq':
      return (
        <>
          W<sub>q</sub>
        </>
      );
    case 'PK':
      return (
        <>
          P<sub>K</sub>
        </>
      );
    case 'lambdaEf':
      return (
        <>
          λ<sub>ef</sub>
        </>
      );
    case 'pm':
      return <>±</>;
    default:
      return <>{id}</>;
  }
}
