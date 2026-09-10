import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { DetalleRubroService } from './detalle-rubro.service';
import { UsuarioService } from './usuario.service';

/** Rubro "MANEJA PERMISO (SI = 1, NO = 0)" — docs/seguridad/API-PERMISOS-FRONTEND.md §2. */
const RUBRO_INTERRUPTOR_PERMISOS = 7;
const DETALLE_INTERRUPTOR_PERMISOS = 1;

export interface ResultadoPermiso {
  permitido: boolean;
  mensaje?: string;
}

/**
 * Verificación de permisos del árbol de seguridades de SAA (`GET /rest/usro/verificaPermiso/...`).
 * Contrato completo en `docs/seguridad/API-PERMISOS-FRONTEND.md` — no lo repitas en otro lugar,
 * son ~290 puntos de uso y todos pasan por acá.
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  /** Una sola llamada HTTP por sesión — `shareReplay(1)` cachea el resultado del interruptor. */
  private interruptorValida$?: Observable<boolean>;

  constructor(
    private usuarioService: UsuarioService,
    private detalleRubroService: DetalleRubroService,
  ) {}

  private consultarInterruptor(): Observable<boolean> {
    if (!this.interruptorValida$) {
      this.interruptorValida$ = this.detalleRubroService.getRubros(RUBRO_INTERRUPTOR_PERMISOS).pipe(
        map((detalles) => {
          const detalle = (detalles ?? []).find((d) => d.codigoAlterno === DETALLE_INTERRUPTOR_PERMISOS);
          // Trampa medida en el contrato: el dato puede estar en valorAlfanumerico o en
          // descripcion según cuál de las dos columnas haya quedado con contenido.
          const valorAlfanumerico = detalle?.valorAlfanumerico?.trim();
          const valor = valorAlfanumerico ? valorAlfanumerico : (detalle?.descripcion ?? '').trim();
          return valor === '1';
        }),
        // Interruptor no legible (error de red, rubro ausente) => no validar.
        catchError(() => of(false)),
        shareReplay(1),
      );
    }
    return this.interruptorValida$;
  }

  /**
   * Verifica `idPermiso` contra el backend. `idPermiso` ausente nunca bloquea (activación
   * incremental) y el interruptor apagado tampoco llama al backend.
   */
  verificar(idPermiso?: number | null): Observable<ResultadoPermiso> {
    if (idPermiso === undefined || idPermiso === null) {
      return of<ResultadoPermiso>({ permitido: true });
    }
    return this.consultarInterruptor().pipe(
      switchMap((valida) => {
        if (!valida) {
          return of<ResultadoPermiso>({ permitido: true });
        }
        const idEmpresa = this.usuarioService.getEmpresaLog()?.codigo;
        const idUsuario = this.usuarioService.getUsuarioLog()?.codigo;
        if (!idEmpresa || !idUsuario) {
          return of<ResultadoPermiso>({ permitido: true });
        }
        return (this.usuarioService.verificaPermiso(idEmpresa, idUsuario, idPermiso) as Observable<string>).pipe(
          map((resultado: string): ResultadoPermiso =>
            resultado === 'OK'
              ? { permitido: true }
              : { permitido: false, mensaje: resultado },
          ),
          catchError(() => of<ResultadoPermiso>({ permitido: true })),
        );
      }),
    );
  }

  /**
   * Conveniencia para los puntos de uso: ejecuta `accion` si hay permiso, o `alNegar` con el
   * mensaje del backend si no. Se verifica ANTES de abrir el diálogo/navegar, nunca después.
   */
  ejecutarSiPermitido(idPermiso: number | undefined | null, accion: () => void, alNegar?: (mensaje: string) => void): void {
    this.verificar(idPermiso).subscribe((resultado) => {
      if (resultado.permitido) {
        accion();
      } else if (alNegar) {
        alNegar(resultado.mensaje ?? '');
      }
    });
  }
}
