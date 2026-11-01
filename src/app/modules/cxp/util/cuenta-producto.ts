import { ProductoPago } from '../model/producto_pago';

/**
 * Cuenta contable de un producto de pago: la de su grupo (`grupoProducto.planCuenta`), que es la
 * que usa el backend para contabilizar. Se muestra como «<número> – <nombre>». No se inventa nada:
 * si el producto no trae grupo o el grupo no trae cuenta, `ok` es false y `etiqueta` lo dice.
 */
export interface CuentaDeProducto {
  ok: boolean;
  /** «1.2.3.4 – Nombre de la cuenta», o el aviso de que no hay cuenta. */
  etiqueta: string;
  /** Número de cuenta contable (vacío si no hay). */
  numero: string;
}

export function cuentaDeProducto(p: ProductoPago | null | undefined): CuentaDeProducto {
  const cuenta = p?.grupoProducto?.planCuenta;
  if (!cuenta?.cuentaContable) {
    return { ok: false, etiqueta: 'Sin cuenta contable', numero: '' };
  }
  return {
    ok: true,
    etiqueta: cuenta.nombre ? `${cuenta.cuentaContable} – ${cuenta.nombre}` : cuenta.cuentaContable,
    numero: cuenta.cuentaContable,
  };
}

/** ¿El producto coincide con el texto de búsqueda? Por nombre, código o cuenta contable (número o nombre). */
export function productoCoincide(p: ProductoPago, q: string): boolean {
  const cuenta = p.grupoProducto?.planCuenta;
  return (
    !!p.nombre?.toLowerCase().includes(q) ||
    !!p.codigo?.toLowerCase().includes(q) ||
    !!cuenta?.cuentaContable?.toLowerCase().includes(q) ||
    !!cuenta?.nombre?.toLowerCase().includes(q)
  );
}
