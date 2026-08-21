import { Injectable } from '@angular/core';

/** Lo que hay que devolver tal cual al volver del formulario a la lista. */
export interface EstadoLista {
  filtro: string;
  ordenPor: string | null;
  ascendente: boolean;
  scroll: number;
  /** Código de la fila que se estaba editando, para señalarla al volver. */
  destacado: number | null;
}

const VACIO: EstadoLista = {
  filtro: '',
  ordenPor: null,
  ascendente: true,
  scroll: 0,
  destacado: null,
};

/**
 * Memoria de las listas del módulo entre una vista y otra.
 *
 * Con la lista y el formulario como **vistas separadas**, salir a editar y volver reiniciaba el
 * filtro, el orden y la posición del scroll: el usuario que estaba revisando la fila cuarenta de
 * una lista filtrada tenía que rehacer el camino cada vez. Se guarda por clave de lista y vive
 * lo que dure la sesión de la pantalla; no se persiste porque no es preferencia del usuario,
 * es el hilo de lo que estaba haciendo.
 */
@Injectable({ providedIn: 'root' })
export class EstadoListaService {
  private readonly estados = new Map<string, EstadoLista>();

  recuperar(clave: string): EstadoLista {
    return { ...VACIO, ...(this.estados.get(clave) ?? {}) };
  }

  guardar(clave: string, estado: Partial<EstadoLista>): void {
    this.estados.set(clave, { ...this.recuperar(clave), ...estado });
  }

  /** Se olvida al salir de la ficha: otro colaborador es otro hilo. */
  olvidar(prefijo: string): void {
    for (const clave of [...this.estados.keys()]) {
      if (clave.startsWith(prefijo)) this.estados.delete(clave);
    }
  }
}
