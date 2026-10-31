// M/M/1/K con las fórmulas de la profesora, sin cambiarlas.
// Se agregan P_K, λef, W con λef y el caso ρ = 1.

export interface ResultadoMM1K {
  lambda: number;
  mu: number;
  K: number;
  rho: number;
  p0: number;
  /** Pₙ con n = K: probabilidad de que alguien llegue y se vaya. */
  pK: number;
  L: number;
  Lq: number;
  /** W = L/λ (por persona que llega; 0 para quien se va). */
  W: number;
  Wq: number;
  lambdaEf: number;
  /** W = L/λef: tiempo de quien entra, comparable con la simulación. */
  WEf: number;
  WqEf: number;
  /** Pₙ para n = 0..K. */
  pn: number[];
}

const EPS_RHO_UNO = 1e-9;

export function mm1k(lambda: number, mu: number, K: number): ResultadoMM1K {
  if (!Number.isFinite(lambda) || lambda < 0) throw new RangeError('λ debe ser un número mayor o igual a 0');
  if (!Number.isFinite(mu) || mu <= 0) throw new RangeError('μ debe ser un número mayor que 0');
  if (!Number.isInteger(K) || K < 1) throw new RangeError('K debe ser un entero mayor o igual a 1');

  const rho = lambda / mu;
  let p0: number;
  let L: number;
  if (Math.abs(rho - 1) < EPS_RHO_UNO) {
    p0 = 1 / (K + 1);
    L = K / 2;
  } else {
    const rK1 = Math.pow(rho, K + 1);
    p0 = (1 - rho) / (1 - rK1);
    L = rho / (1 - rho) - ((K + 1) * rK1) / (1 - rK1);
  }
  const pn = Array.from({ length: K + 1 }, (_, n) => p0 * Math.pow(rho, n));
  const pK = pn[K];
  const Lq = L - (1 - p0);
  const lambdaEf = lambda * (1 - pK);
  return {
    lambda,
    mu,
    K,
    rho,
    p0,
    pK,
    L,
    Lq,
    W: lambda > 0 ? L / lambda : 0,
    Wq: lambda > 0 ? Lq / lambda : 0,
    lambdaEf,
    WEf: lambdaEf > 0 ? L / lambdaEf : 0,
    WqEf: lambdaEf > 0 ? Lq / lambdaEf : 0,
    pn,
  };
}
