import { signal } from '@angular/core';

/**
 * Selección múltiple de filas por su `codigo`, para las bandejas que actúan en bloque.
 *
 * La usan las pantallas cuyo proceso recibe una lista de identificadores —el registro de
 * recepción de roles de pago, y la misma forma que ya tiene la bandeja de horas extra—, donde
 * el usuario marca varias filas y confirma una sola vez.
 *
 * Reemplaza el `Set` por uno nuevo en cada cambio, porque un `signal` compara por referencia y
 * mutar el conjunto en su sitio no dispararía la recomposición de la vista.
 */
export class SeleccionFilas {
  private readonly marcados = signal<Set<number>>(new Set());

  /** Códigos marcados, en el orden en que los devuelve el conjunto. */
  valores(): number[] {
    return [...this.marcados()];
  }

  cantidad(): number {
    return this.marcados().size;
  }

  contiene(codigo: number): boolean {
    return this.marcados().has(codigo);
  }

  alternar(codigo: number): void {
    const copia = new Set(this.marcados());
    copia.has(codigo) ? copia.delete(codigo) : copia.add(codigo);
    this.marcados.set(copia);
  }

  /** Marca exactamente estos códigos, descartando lo que hubiera antes. */
  fijar(codigos: number[]): void {
    this.marcados.set(new Set(codigos));
  }

  limpiar(): void {
    this.marcados.set(new Set());
  }

  /** `true` si todos los códigos dados están marcados y la lista no está vacía. */
  cubre(codigos: number[]): boolean {
    return codigos.length > 0 && codigos.every((codigo) => this.marcados().has(codigo));
  }
}
