import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Empresa } from '../../../shared/model/empresa';
import { Jerarquia } from '../../../shared/model/jerarquia';
import { DetallePlantilla, TipoMovimiento } from '../model/detalle-plantilla-general';
import { NaturalezaCuenta } from '../model/naturaleza-cuenta';
import { PlanCuenta } from '../model/plan-cuenta';
import { EstadoPlantilla, Plantilla } from '../model/plantilla-general';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class PlantillaService {
  private static readonly EMPRESA_CODIGO = 280;

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // Bandera para indicar si estamos en modo demostración
  public readonly usingMockData = true;

  // Jerarquía mock
  private mockJerarquia: Jerarquia = {
    codigo: 1,
    nombre: 'Matriz',
    nivel: 1,
    codigoPadre: 0,
    descripcion: 'Jerarquía principal',
    ultimoNivel: 1,
    rubroTipoEstructuraP: 1,
    rubroTipoEstructuraH: 1,
    codigoAlterno: 1,
    rubroNivelCaracteristicaP: 1,
    rubroNivelCaracteristicaH: 1,
  };

  // Empresa mock para ejemplos
  private mockEmpresa: Empresa = {
    codigo: 280,
    jerarquia: this.mockJerarquia,
    nombre: 'GAEMI NEXUS',
    nivel: 1,
    codigoPadre: 0,
    ingresado: 1,
  };

  // Naturaleza de cuentas mock
  private mockNaturalezas: NaturalezaCuenta[] = [
    {
      codigo: 1,
      nombre: 'Activo',
      tipo: 1,
      numero: 1,
      estado: 1,
      empresa: this.mockEmpresa,
      manejaCentroCosto: 0,
    },
    {
      codigo: 2,
      nombre: 'Pasivo',
      tipo: 2,
      numero: 2,
      estado: 1,
      empresa: this.mockEmpresa,
      manejaCentroCosto: 0,
    },
    {
      codigo: 5,
      nombre: 'Gasto',
      tipo: 5,
      numero: 5,
      estado: 1,
      empresa: this.mockEmpresa,
      manejaCentroCosto: 1,
    },
  ];

  // Plan de cuentas mock para ejemplos
  private mockPlanCuentas: PlanCuenta[] = [
    {
      codigo: 1,
      naturalezaCuenta: this.mockNaturalezas[0],
      cuentaContable: '110505',
      nombre: 'Bancos Nacionales',
      tipo: 1,
      nivel: 3,
      idPadre: 0,
      estado: 1,
      fechaInactivo: new Date(),
      empresa: this.mockEmpresa,
      fechaUpdate: new Date(),
    },
    {
      codigo: 2,
      naturalezaCuenta: this.mockNaturalezas[1],
      cuentaContable: '236505',
      nombre: 'Retención en la Fuente',
      tipo: 1,
      nivel: 3,
      idPadre: 0,
      estado: 1,
      fechaInactivo: new Date(),
      empresa: this.mockEmpresa,
      fechaUpdate: new Date(),
    },
    {
      codigo: 3,
      naturalezaCuenta: this.mockNaturalezas[2],
      cuentaContable: '510501',
      nombre: 'Sueldos y Salarios',
      tipo: 1,
      nivel: 3,
      idPadre: 0,
      estado: 1,
      fechaInactivo: new Date(),
      empresa: this.mockEmpresa,
      fechaUpdate: new Date(),
    },
  ];

  /** Retorna plan de cuentas demo (solo modo mock) */
  getPlanCuentasDemo(): PlanCuenta[] {
    return this.mockPlanCuentas;
  }

  // Datos mock para plantillas
  private mockPlantillas: Plantilla[] = [
    {
      codigo: 1,
      nombre: 'Plantilla Asientos de Nomina',
      codigoAlterno: 1001,
      estado: EstadoPlantilla.ACTIVO,
      empresa: this.mockEmpresa,
      observacion: 'Plantilla para registrar asientos de nómina mensual',
    },
    {
      codigo: 2,
      nombre: 'Plantilla Cierre Mensual',
      codigoAlterno: 1002,
      estado: EstadoPlantilla.ACTIVO,
      empresa: this.mockEmpresa,
      observacion: 'Plantilla para asientos de cierre mensual',
    },
    {
      codigo: 3,
      nombre: 'Plantilla Provisiones',
      codigoAlterno: 1003,
      estado: EstadoPlantilla.ACTIVO,
      empresa: this.mockEmpresa,
      observacion: 'Plantilla para registrar provisiones contables',
    },
    {
      codigo: 4,
      nombre: 'Plantilla Depreciaciones',
      codigoAlterno: 1004,
      estado: EstadoPlantilla.INACTIVO,
      empresa: this.mockEmpresa,
      observacion: 'Plantilla para registrar depreciaciones de activos fijos',
      fechaInactivo: new Date('2024-02-01'),
    },
  ];

  // Datos mock para detalles
  private mockDetalles: DetallePlantilla[] = [
    // Detalles para Plantilla 1 (Nómina)
    {
      codigo: 1,
      plantilla: this.mockPlantillas[0],
      planCuenta: this.mockPlanCuentas[2], // Sueldos y Salarios
      descripcion: 'Registro de sueldos básicos',
      movimiento: TipoMovimiento.DEBE,
      auxiliar1: 1,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
    },
    {
      codigo: 2,
      plantilla: this.mockPlantillas[0],
      planCuenta: this.mockPlanCuentas[1], // Retención en la Fuente
      descripcion: 'Retención en la fuente por sueldos',
      movimiento: TipoMovimiento.HABER,
      auxiliar1: 1,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
    },
    {
      codigo: 3,
      plantilla: this.mockPlantillas[0],
      planCuenta: this.mockPlanCuentas[0], // Bancos Nacionales
      descripcion: 'Pago de nómina por banco',
      movimiento: TipoMovimiento.HABER,
      auxiliar1: 0,
      auxiliar2: 1,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
    },
  ];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las plantillas usando el endpoint del backend
   */
  getAll(): Observable<Plantilla[]> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetAll}`;

    return this.http.get<Plantilla[]>(url).pipe(
      catchError(() => {
        console.log('[PlantillaService] Usando datos mock para plantillas');
        return of(this.mockPlantillas);
      })
    );
  }

  /**
   * Obtiene una plantilla por ID
   */
  getById(codigo: number): Observable<Plantilla | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}${codigo}`;

    return this.http.get<Plantilla>(url).pipe(
      catchError(() => {
        console.log('[PlantillaService] Usando datos mock para plantilla');
        const item = this.mockPlantillas.find((p) => p.codigo === codigo);
        return of(item || null);
      })
    );
  }

  /**
   * Obtiene detalles de una plantilla
   */
  getDetallesByPlantillaCodigo(plantillaCodigo: number): Observable<DetallePlantilla[]> {
    // Usar el endpoint consistente con DetallePlantillaService
    const wsGetDetalles = '/getByParent/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetDetalles}${plantillaCodigo}`;

    return this.http.get<DetallePlantilla[]>(url).pipe(
      catchError(() => {
        console.log('[PlantillaService] Usando datos mock para detalles');
        const detalles = this.mockDetalles.filter((d) => d.plantilla.codigo === plantillaCodigo);
        return of(detalles);
      })
    );
  }

  /**
   * Crea una nueva plantilla
   */
  add(plantilla: Plantilla): Observable<Plantilla | null> {
    return this.http.post<Plantilla>(ServiciosCnt.RS_PLNS, plantilla, this.httpOptions).pipe(
      catchError(() => {
        // Simular creación en mock
        const newCodigo = Math.max(...this.mockPlantillas.map((p) => p.codigo)) + 1;
        const newItem: Plantilla = {
          ...plantilla,
          codigo: newCodigo,
          empresa: this.mockEmpresa,
        };
        this.mockPlantillas.push(newItem);
        return of(newItem);
      })
    );
  }

  /**
   * Actualiza una plantilla existente
   */
  update(plantilla: Plantilla): Observable<Plantilla | null> {
    return this.http.put<Plantilla>(ServiciosCnt.RS_PLNS, plantilla, this.httpOptions).pipe(
      catchError(() => {
        // Simular actualización en mock
        const index = this.mockPlantillas.findIndex((p) => p.codigo === plantilla.codigo);
        if (index !== -1) {
          this.mockPlantillas[index] = plantilla;
          return of(this.mockPlantillas[index]);
        }
        return of(null);
      })
    );
  }

  /**
   * Elimina una plantilla
   */
  delete(codigo: number): Observable<boolean> {
    const wsDelete = '/' + codigo;
    const url = `${ServiciosCnt.RS_PLNS}${wsDelete}`;

    return this.http.delete<Plantilla>(url, this.httpOptions).pipe(
      map(() => true),
      catchError(() => {
        // Simular eliminación en mock
        const index = this.mockPlantillas.findIndex((p) => p.codigo === codigo);
        if (index !== -1) {
          this.mockPlantillas.splice(index, 1);
          // Eliminar también los detalles
          this.mockDetalles.splice(
            0,
            this.mockDetalles.length,
            ...this.mockDetalles.filter((d) => d.plantilla.codigo !== codigo)
          );
          return of(true);
        }
        return of(false);
      })
    );
  }

  /**
   * Busca plantillas por criterios
   */
  selectByCriteria(criterios: any): Observable<Plantilla[] | null> {
    const wsSelectByCriteria = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PLNS}${wsSelectByCriteria}`;

    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    // Incluir filtro de empresa en el request
    const criteriosConEmpresa = { ...criterios, empresa: { codigo: empresaCodigo } };

    return this.http.post<Plantilla[]>(url, criteriosConEmpresa, this.httpOptions).pipe(
      catchError(() => {
        console.log('[PlantillaService] Usando filtros mock');
        let filtered = this.mockPlantillas.filter((p) => p?.empresa?.codigo === empresaCodigo);

        if (criterios.nombre) {
          filtered = filtered.filter((p) =>
            p.nombre.toLowerCase().includes(criterios.nombre.toLowerCase())
          );
        }

        if (criterios.estado !== undefined) {
          filtered = filtered.filter((p) => p.estado === criterios.estado);
        }

        return of(filtered);
      })
    );
  }

  /**
   * Obtiene plantilla completa con detalles
   */
  getPlantillaCompleta(
    codigo: number
  ): Observable<{ plantilla: Plantilla; detalles: DetallePlantilla[] } | null> {
    // En el backend real, esto sería un endpoint especializado
    return new Observable((observer) => {
      this.getById(codigo).subscribe((plantilla) => {
        if (plantilla) {
          this.getDetallesByPlantillaCodigo(codigo).subscribe((detalles) => {
            observer.next({ plantilla, detalles });
            observer.complete();
          });
        } else {
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  /**
   * Cambia el estado de una plantilla
   */
  cambiarEstado(codigo: number, estado: EstadoPlantilla): Observable<boolean> {
    // Buscar la plantilla actual
    return this.getById(codigo).pipe(
      map((plantilla) => {
        if (plantilla) {
          plantilla.estado = estado;
          if (estado === EstadoPlantilla.INACTIVO) {
            plantilla.fechaInactivo = new Date();
          }
          this.update(plantilla).subscribe();
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Manejo de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoText(estado: EstadoPlantilla): string {
    switch (estado) {
      case EstadoPlantilla.ACTIVO:
        return 'Activo';
      case EstadoPlantilla.INACTIVO:
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtiene el texto del tipo de movimiento
   */
  getMovimientoText(movimiento: TipoMovimiento): string {
    switch (movimiento) {
      case TipoMovimiento.DEBE:
        return 'Debe';
      case TipoMovimiento.HABER:
        return 'Haber';
      default:
        return 'Desconocido';
    }
  }
}
