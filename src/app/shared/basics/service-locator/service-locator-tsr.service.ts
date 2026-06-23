import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccionesGrid } from '../constantes';
import { EntidadesTesoreria } from '../../../modules/tsr/model/entidades-cnt';
import { BancoService } from '../../../modules/tsr/service/banco.service';
import { Banco } from '../../../modules/tsr/model/banco';
import { DetalleRubroService } from '../../services/detalle-rubro.service';
import { DatosBusqueda } from '../../model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../model/datos-busqueda/tipo-comandos-busqueda';

@Injectable({
  providedIn: 'root',
})
export class ServiceLocatorTsrService {
  reg: any;

  /** ID del rubro padre para tipo de banco (getDetallesByParent usa el código PK). */
  private readonly RUBRO_TIPO_BANCO_ID = 24;

  constructor(
    public bancoService: BancoService,
    private detalleRubroService: DetalleRubroService,
  ) {}

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    switch (entidad) {
      case EntidadesTesoreria.BANCO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = { ...value } as Banco;
            this.reg.estado = this.reg.estado ?? 1;
            this.completarEmpresa(this.reg);
            this.completarRubroTipoBanco(this.reg);
            return firstValueFrom(this.bancoService.add(this.reg));
          }
          case AccionesGrid.EDIT: {
            this.reg = { ...value } as Banco;
            this.completarRubroTipoBanco(this.reg);
            return firstValueFrom(this.bancoService.update(this.reg));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.bancoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      default: {
        console.warn('ServiceLocatorTsrService: entidad no registrada', entidad);
        return Promise.resolve(undefined);
      }
    }
  }

  recargarValores(entidad: number): Promise<any> {
    const empresaCodigo = this.getEmpresaCodigo();
    switch (entidad) {
      case EntidadesTesoreria.BANCO: {
        const criterios: DatosBusqueda[] = [];
        if (empresaCodigo) {
          const db = new DatosBusqueda();
          db.asignaValorConCampoPadre(
            TipoDatosBusqueda.LONG,
            'empresa',
            'codigo',
            empresaCodigo.toString(),
            TipoComandosBusqueda.IGUAL
          );
          criterios.push(db);
        }
        const orden = new DatosBusqueda();
        orden.orderBy('nombre');
        criterios.push(orden);
        return firstValueFrom(this.bancoService.selectByCriteria(criterios));
      }
      default: {
        console.warn('ServiceLocatorTsrService: entidad no registrada para recargar', entidad);
        return Promise.resolve(undefined);
      }
    }
  }

  // ─── helpers privados ────────────────────────────────────────────────────────

  private getEmpresaCodigo(): number | null {
    const raw = localStorage.getItem('idEmpresa');
    return raw ? parseInt(raw, 10) : null;
  }

  private completarEmpresa(reg: any): void {
    const empresaCodigo = this.getEmpresaCodigo();
    if (empresaCodigo) {
      reg.empresa = { codigo: empresaCodigo };
    }
  }

  private completarRubroTipoBanco(reg: any): void {
    if (!reg.rubroTipoBancoH) return;

    const rubros = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_BANCO_ID);
    const detalle = rubros.find((r) => r.codigoAlterno === Number(reg.rubroTipoBancoH));
    if (detalle) {
      reg.rubroTipoBancoP = detalle.rubro?.codigoAlterno ?? this.RUBRO_TIPO_BANCO_ID;
    }
  }
}
