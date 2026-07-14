import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { Titular } from '../../../tsr/model/titular';
import { PersonaRolService } from '../../../tsr/service/persona-rol.service';

@Injectable({ providedIn: 'root' })
export class PersonaClienteEmitirService {
  private readonly ROL_CLIENTE = 1;

  constructor(private personaRolService: PersonaRolService) {}

  buscarClientes(termino: string): Observable<Titular[]> {
    return this.buscarTitularesPorRol(termino, this.ROL_CLIENTE);
  }

  buscarTitularesPorRol(termino: string, rolCodigo: number): Observable<Titular[]> {
    const empresaCodigo = this.getEmpresaCodigo();
    if (!empresaCodigo) {
      return of([]);
    }

    const criterios: DatosBusqueda[] = [];

    const cRol = new DatosBusqueda();
    cRol.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'rubroRolPersonaH',
      rolCodigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    cRol.setNumeroCampoRepetido(0);
    criterios.push(cRol);

    const cEmpresa = new DatosBusqueda();
    cEmpresa.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'empresa',
      'codigo',
      empresaCodigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    cEmpresa.setNumeroCampoRepetido(0);
    criterios.push(cEmpresa);

    const cEstado = new DatosBusqueda();
    cEstado.asignaUnCampoSinTrunc(TipoDatos.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);
    cEstado.setNumeroCampoRepetido(0);
    criterios.push(cEstado);

    const terminoNormalizado = (termino || '').trim().toLowerCase();

    return this.personaRolService.selectByCriteria(criterios).pipe(
      map((roles) => {
        const titulares = (roles || [])
          .map((rol) => rol.titular)
          .filter((titular): titular is Titular => !!titular);

        const unicos = titulares.filter(
          (titular, index, arr) =>
            index === arr.findIndex((it) => (it.codigo || 0) === (titular.codigo || 0))
        );

        if (!terminoNormalizado) {
          return unicos;
        }

        return unicos.filter((titular) => {
          const nombre = (titular.nombre || '').toLowerCase();
          const razonSocial = (titular.razonSocial || '').toLowerCase();
          const identificacion = (titular.identificacion || '').toLowerCase();
          return (
            nombre.includes(terminoNormalizado) ||
            razonSocial.includes(terminoNormalizado) ||
            identificacion.includes(terminoNormalizado)
          );
        });
      }),
      catchError(() => of([]))
    );
  }

  private getEmpresaCodigo(): number | null {
    const idEmpresa = sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa');
    if (idEmpresa) {
      const codigo = parseInt(idEmpresa, 10);
      if (!Number.isNaN(codigo)) {
        return codigo;
      }
    }

    const empresaId = sessionStorage.getItem('empresaId') || localStorage.getItem('empresaId');
    if (empresaId) {
      const codigo = parseInt(empresaId, 10);
      if (!Number.isNaN(codigo)) {
        return codigo;
      }
    }

    const idSucursal = sessionStorage.getItem('idSucursal') || localStorage.getItem('idSucursal');
    if (idSucursal) {
      const codigo = parseInt(idSucursal, 10);
      if (!Number.isNaN(codigo)) {
        return codigo;
      }
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
