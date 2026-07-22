import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { Titular } from '../../../tsr/model/titular';
import { PersonaRolService } from '../../../tsr/service/persona-rol.service';

/** codigoAlterno del rubro padre de roles (rubro 55) */
const RUBRO_ROL_P = 55;

@Injectable({ providedIn: 'root' })
export class PersonaClienteEmitirService {
  /** codigoAlterno del detalle "CLIENTE" dentro del rubro 55 */
  private readonly ROL_CLIENTE = 1;

  constructor(private personaRolService: PersonaRolService) {}

  buscarClientes(termino: string): Observable<Titular[]> {
    return this.buscarTitularesPorRol(termino, this.ROL_CLIENTE);
  }

  /**
   * Busca PersonaRol filtrando por empresa + rubroRolPersonaP + rubroRolPersonaH.
   * Los titulares vienen embebidos en cada registro de PersonaRol.
   */
  buscarTitularesPorRol(_termino: string, rolCodigo: number): Observable<Titular[]> {
    const empresaCodigo = this.getEmpresaCodigo();
    if (!empresaCodigo) {
      return of([]);
    }

    const criterios: DatosBusqueda[] = [];

    // Rubro padre (55 = roles)
    const cRolP = new DatosBusqueda();
    cRolP.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'rubroRolPersonaP', RUBRO_ROL_P.toString(), TipoComandosBusqueda.IGUAL
    );
    cRolP.setNumeroCampoRepetido(0);
    criterios.push(cRolP);

    // Detalle del rubro (codigoAlterno: 1=CLIENTE, 2=PROVEEDOR, etc.)
    const cRolH = new DatosBusqueda();
    cRolH.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'rubroRolPersonaH', rolCodigo.toString(), TipoComandosBusqueda.IGUAL
    );
    cRolH.setNumeroCampoRepetido(0);
    criterios.push(cRolH);

    // Empresa
    const cEmpresa = new DatosBusqueda();
    cEmpresa.asignaValorConCampoPadre(
      TipoDatos.LONG, 'empresa', 'codigo', empresaCodigo.toString(), TipoComandosBusqueda.IGUAL
    );
    cEmpresa.setNumeroCampoRepetido(0);
    criterios.push(cEmpresa);

    // Estado activo
    const cEstado = new DatosBusqueda();
    cEstado.asignaUnCampoSinTrunc(TipoDatos.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);
    cEstado.setNumeroCampoRepetido(0);
    criterios.push(cEstado);

    return this.personaRolService.selectByCriteria(criterios).pipe(
      map((roles) =>
        (roles || [])
          .map((rol) => rol.titular)
          .filter((t): t is Titular => !!t)
          .filter((t, i, arr) => i === arr.findIndex((x) => (x.codigo || 0) === (t.codigo || 0)))
      ),
      catchError(() => of([]))
    );
  }

  private getEmpresaCodigo(): number | null {
    const idEmpresa = sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa');
    if (idEmpresa) {
      const codigo = parseInt(idEmpresa, 10);
      if (!Number.isNaN(codigo)) return codigo;
    }

    const empresaId = sessionStorage.getItem('empresaId') || localStorage.getItem('empresaId');
    if (empresaId) {
      const codigo = parseInt(empresaId, 10);
      if (!Number.isNaN(codigo)) return codigo;
    }

    const idSucursal = sessionStorage.getItem('idSucursal') || localStorage.getItem('idSucursal');
    if (idSucursal) {
      const codigo = parseInt(idSucursal, 10);
      if (!Number.isNaN(codigo)) return codigo;
    }

    const empresaStr = sessionStorage.getItem('empresa') || localStorage.getItem('empresa');
    if (empresaStr) {
      try {
        const empresa = JSON.parse(empresaStr);
        const codigo = Number(empresa?.codigo);
        return Number.isNaN(codigo) ? null : codigo;
      } catch {
        return null;
      }
    }

    return null;
  }
}

