import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { Referencia } from './detector-referencias';

/** Contexto de la pantalla al abrir una referencia: empresa y mes de la novedad (para cuentas y códigos de novedad). */
export interface ContextoNavegacion {
  idEmpresa: number | null;
  anio?: number | null;
  mes?: number | null;
  /** Módulo de la novedad: una "factura" en CXC es de venta; en el resto, de compra. */
  modulo?: string | null;
}

export type PeticionNavegacion =
  | { tipo: 'NOVEDAD'; idNovedad: number }
  | { tipo: 'DECISION'; numero: string };

/**
 * C25b — Navegación de Seguimiento Novedades: toda referencia de la pantalla pasa por aquí.
 *  - DECISION: la pantalla principal cambia a la pestaña «Decisiones» con esa decisión abierta;
 *  - NOVEDAD (y cualquier ficha que resuelva a una novedad): se abre en el panel de detalle;
 *  - el resto: diálogo de solo lectura FichaReferenciaDialogComponent (GET /nvdd/referencia), que ofrece abrir la
 *    pantalla del módulo cuando existe una que acepte el id (asiento, entidad, carga Petro, extracto, empleado).
 */
@Injectable({ providedIn: 'root' })
export class NavegacionReferenciasService {
  private dialog = inject(MatDialog);
  private readonly peticiones$ = new Subject<PeticionNavegacion>();
  /** La pantalla principal se suscribe para abrir novedades y decisiones. */
  readonly peticiones = this.peticiones$.asObservable();

  abrirNovedad(idNovedad: number): void {
    this.dialog.closeAll();
    this.peticiones$.next({ tipo: 'NOVEDAD', idNovedad });
  }

  abrirDecision(numero: string): void {
    this.dialog.closeAll();
    this.peticiones$.next({ tipo: 'DECISION', numero: numero.toUpperCase().replace(/B$/, 'b') });
  }

  /** Abre una referencia detectada en un texto o una celda. */
  abrir(ref: Referencia, ctx: ContextoNavegacion): void {
    if (ref.tipo === 'DECISION') {
      this.abrirDecision(ref.valor);
      return;
    }
    const tipo = ref.tipo === 'FACTURA' ? ((ctx.modulo || '').toUpperCase() === 'CXC' ? 'CXC' : 'CXP') : ref.tipo;
    // import diferido: el diálogo también usa este servicio (evita el ciclo de imports)
    import('./ficha-referencia-dialog.component').then(({ FichaReferenciaDialogComponent }) => {
      this.dialog.open(FichaReferenciaDialogComponent, {
        width: '980px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        data: { tipo, valor: ref.valor, ctx },
        autoFocus: false,
      });
    });
  }
}
