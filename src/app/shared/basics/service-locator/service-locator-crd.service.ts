import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccionesGrid } from '../constantes';
import { EntidadesCrd } from '../../../modules/crd/model/entidades-crd';
import { EstadoParticipeService } from '../../../modules/crd/service/estado-participe.service';
import { EstadoPrestamoService } from '../../../modules/crd/service/estado-prestamo.service';
import { EstadoCesantiaService } from '../../../modules/crd/service/estado-cesantia.service';
import { EstadoCivilService } from '../../../modules/crd/service/estado-civil.service';
import { EstadoParticipe } from '../../../modules/crd/model/estado-participe';
import { EstadoPrestamo } from '../../../modules/crd/model/estado-prestamo';
import { EstadoCesantia } from '../../../modules/crd/model/estado-cesantia';
import { EstadoCivil } from '../../../modules/crd/model/estado-civil';
// Servicios de Tipos
import { TipoContratoService } from '../../../modules/crd/service/tipo-contrato.service';
import { TipoParticipeService } from '../../../modules/crd/service/tipo-participe.service';
import { TipoPrestamoService } from '../../../modules/crd/service/tipo-prestamo.service';
import { TipoRequisitoPrestamoService } from '../../../modules/crd/service/tipo-requisito-prestamo.service';
import { TipoCesantiaService } from '../../../modules/crd/service/tipo-cesantia.service';
import { TipoCalificacionCreditoService } from '../../../modules/crd/service/tipo-calificacion-credito.service';
import { TipoAporteService } from '../../../modules/crd/service/tipo-aporte.service';
import { TipoAdjuntoService } from '../../../modules/crd/service/tipo-adjunto.service';
import { TipoGeneroService } from '../../../modules/crd/service/tipo-genero.service';
import { TipoIdentificacionService } from '../../../modules/crd/service/tipo-identificacion.service';
import { TipoViviendaService } from '../../../modules/crd/service/tipo-vivienda.service';
// Modelos de Tipos
import { TipoContrato } from '../../../modules/crd/model/tipo-contrato';
import { TipoParticipe } from '../../../modules/crd/model/tipo-participe';
import { TipoPrestamo } from '../../../modules/crd/model/tipo-prestamo';
import { TipoRequisitoPrestamo } from '../../../modules/crd/model/tipo-requisito-prestamo';
import { TipoCesantia } from '../../../modules/crd/model/tipo-cesantia';
import { TipoCalificacionCredito } from '../../../modules/crd/model/tipo-calificacion-credito';
import { TipoAporte } from '../../../modules/crd/model/tipo-aporte';
import { TipoAdjunto } from '../../../modules/crd/model/tipo-adjunto';
import { TipoGenero } from '../../../modules/crd/model/tipo-genero';
import { TipoIdentificacion } from '../../../modules/crd/model/tipo-identificacion';
import { TipoVivienda } from '../../../modules/crd/model/tipo-vivienda';
// Servicios de Listados
import { MotivoPrestamoService } from '../../../modules/crd/service/motivo-prestamo.service';
import { MetodoPagoService } from '../../../modules/crd/service/metodo-pago.service';
import { NivelEstudioService } from '../../../modules/crd/service/nivel-estudio.service';
import { ProfesionService } from '../../../modules/crd/service/profesion.service';
// Modelos de Listados
import { MotivoPrestamo } from '../../../modules/crd/model/motivo-prestamo';
import { MetodoPago } from '../../../modules/crd/model/metodo-pago';
import { NivelEstudio } from '../../../modules/crd/model/nivel-estudio';
import { Profesion } from '../../../modules/crd/model/profesion';

@Injectable({
  providedIn: 'root'
})
export class ServiceLocatorCrdService {

  reg: any;

  constructor(
    public estadoParticipeService: EstadoParticipeService,
    public estadoPrestamoService: EstadoPrestamoService,
    public estadoCesantiaService: EstadoCesantiaService,
    public estadoCivilService: EstadoCivilService,
    // Servicios de Tipos
    public tipoContratoService: TipoContratoService,
    public tipoParticipeService: TipoParticipeService,
    public tipoPrestamoService: TipoPrestamoService,
    public tipoRequisitoPrestamoService: TipoRequisitoPrestamoService,
    public tipoCesantiaService: TipoCesantiaService,
    public tipoCalificacionCreditoService: TipoCalificacionCreditoService,
    public tipoAporteService: TipoAporteService,
    public tipoAdjuntoService: TipoAdjuntoService,
    public tipoGeneroService: TipoGeneroService,
    public tipoIdentificacionService: TipoIdentificacionService,
    public tipoViviendaService: TipoViviendaService,
    // Servicios de Listados
    public motivoPrestamoService: MotivoPrestamoService,
    public metodoPagoService: MetodoPagoService,
    public nivelEstudioService: NivelEstudioService,
    public profesionService: ProfesionService,
  ) { }

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    switch (entidad) {
      case EntidadesCrd.ESTADO_PARTICIPE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoParticipe;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoParticipeService.add(this.reg as EstadoParticipe));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoParticipe;
            return firstValueFrom(this.estadoParticipeService.update(this.reg as EstadoParticipe));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoParticipeService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ESTADO_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoPrestamoService.add(this.reg as EstadoPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoPrestamo;
            return firstValueFrom(this.estadoPrestamoService.update(this.reg as EstadoPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ESTADO_CESANTIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoCesantia;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoCesantiaService.add(this.reg as EstadoCesantia));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoCesantia;
            return firstValueFrom(this.estadoCesantiaService.update(this.reg as EstadoCesantia));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoCesantiaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ESTADO_CIVIL: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoCivil;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoCivilService.add(this.reg as EstadoCivil));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoCivil;
            return firstValueFrom(this.estadoCivilService.update(this.reg as EstadoCivil));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoCivilService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      // ========== TIPOS ==========
      case EntidadesCrd.TIPO_CONTRATO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoContrato;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoContratoService.add(this.reg as TipoContrato));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoContrato;
            return firstValueFrom(this.tipoContratoService.update(this.reg as TipoContrato));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoContratoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_PARTICIPE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoParticipe;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoParticipeService.add(this.reg as TipoParticipe));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoParticipe;
            return firstValueFrom(this.tipoParticipeService.update(this.reg as TipoParticipe));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoParticipeService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoPrestamoService.add(this.reg as TipoPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoPrestamo;
            return firstValueFrom(this.tipoPrestamoService.update(this.reg as TipoPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_REQUISITO_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoRequisitoPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoRequisitoPrestamoService.add(this.reg as TipoRequisitoPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoRequisitoPrestamo;
            return firstValueFrom(this.tipoRequisitoPrestamoService.update(this.reg as TipoRequisitoPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoRequisitoPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_CESANTIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoCesantia;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoCesantiaService.add(this.reg as TipoCesantia));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoCesantia;
            return firstValueFrom(this.tipoCesantiaService.update(this.reg as TipoCesantia));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoCesantiaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_CALIFICACION_CREDITO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoCalificacionCredito;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoCalificacionCreditoService.add(this.reg as TipoCalificacionCredito));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoCalificacionCredito;
            return firstValueFrom(this.tipoCalificacionCreditoService.update(this.reg as TipoCalificacionCredito));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoCalificacionCreditoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_APORTE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoAporte;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoAporteService.add(this.reg as TipoAporte));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoAporte;
            return firstValueFrom(this.tipoAporteService.update(this.reg as TipoAporte));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoAporteService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_ADJUNTO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoAdjunto;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoAdjuntoService.add(this.reg as TipoAdjunto));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoAdjunto;
            return firstValueFrom(this.tipoAdjuntoService.update(this.reg as TipoAdjunto));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoAdjuntoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_GENERO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoGenero;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoGeneroService.add(this.reg as TipoGenero));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoGenero;
            return firstValueFrom(this.tipoGeneroService.update(this.reg as TipoGenero));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoGeneroService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_IDENTIFICACION: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoIdentificacion;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoIdentificacionService.add(this.reg as TipoIdentificacion));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoIdentificacion;
            return firstValueFrom(this.tipoIdentificacionService.update(this.reg as TipoIdentificacion));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoIdentificacionService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_VIVIENDA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoVivienda;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoViviendaService.add(this.reg as TipoVivienda));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoVivienda;
            return firstValueFrom(this.tipoViviendaService.update(this.reg as TipoVivienda));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoViviendaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      // ========== LISTADOS ==========
      case EntidadesCrd.MOTIVO_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as MotivoPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.motivoPrestamoService.add(this.reg as MotivoPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as MotivoPrestamo;
            return firstValueFrom(this.motivoPrestamoService.update(this.reg as MotivoPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.motivoPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.METODO_PAGO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as MetodoPago;
            this.reg.idEstado = 1;
            return firstValueFrom(this.metodoPagoService.add(this.reg as MetodoPago));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as MetodoPago;
            return firstValueFrom(this.metodoPagoService.update(this.reg as MetodoPago));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.metodoPagoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.NIVEL_ESTUDIO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as NivelEstudio;
            this.reg.idEstado = 1;
            return firstValueFrom(this.nivelEstudioService.add(this.reg as NivelEstudio));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as NivelEstudio;
            return firstValueFrom(this.nivelEstudioService.update(this.reg as NivelEstudio));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.nivelEstudioService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PROFESION: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Profesion;
            this.reg.idEstado = 1;
            return firstValueFrom(this.profesionService.add(this.reg as Profesion));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Profesion;
            return firstValueFrom(this.profesionService.update(this.reg as Profesion));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.profesionService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

  recargarValores(entidad: number): Promise<any> {
    switch (entidad) {
      case EntidadesCrd.ESTADO_PARTICIPE: {
        return firstValueFrom(this.estadoParticipeService.getAll());
      }
      case EntidadesCrd.ESTADO_PRESTAMO: {
        return firstValueFrom(this.estadoPrestamoService.getAll());
      }
      case EntidadesCrd.ESTADO_CESANTIA: {
        return firstValueFrom(this.estadoCesantiaService.getAll());
      }
      case EntidadesCrd.ESTADO_CIVIL: {
        return firstValueFrom(this.estadoCivilService.getAll());
      }
      // ========== TIPOS ==========
      case EntidadesCrd.TIPO_CONTRATO: {
        return firstValueFrom(this.tipoContratoService.getAll());
      }
      case EntidadesCrd.TIPO_PARTICIPE: {
        return firstValueFrom(this.tipoParticipeService.getAll());
      }
      case EntidadesCrd.TIPO_PRESTAMO: {
        return firstValueFrom(this.tipoPrestamoService.getAll());
      }
      case EntidadesCrd.TIPO_REQUISITO_PRESTAMO: {
        return firstValueFrom(this.tipoRequisitoPrestamoService.getAll());
      }
      case EntidadesCrd.TIPO_CESANTIA: {
        return firstValueFrom(this.tipoCesantiaService.getAll());
      }
      case EntidadesCrd.TIPO_CALIFICACION_CREDITO: {
        return firstValueFrom(this.tipoCalificacionCreditoService.getAll());
      }
      case EntidadesCrd.TIPO_APORTE: {
        return firstValueFrom(this.tipoAporteService.getAll());
      }
      case EntidadesCrd.TIPO_ADJUNTO: {
        return firstValueFrom(this.tipoAdjuntoService.getAll());
      }
      case EntidadesCrd.TIPO_GENERO: {
        return firstValueFrom(this.tipoGeneroService.getAll());
      }
      case EntidadesCrd.TIPO_IDENTIFICACION: {
        return firstValueFrom(this.tipoIdentificacionService.getAll());
      }
      case EntidadesCrd.TIPO_VIVIENDA: {
        return firstValueFrom(this.tipoViviendaService.getAll());
      }
      // ========== LISTADOS ==========
      case EntidadesCrd.MOTIVO_PRESTAMO: {
        return firstValueFrom(this.motivoPrestamoService.getAll());
      }
      case EntidadesCrd.METODO_PAGO: {
        return firstValueFrom(this.metodoPagoService.getAll());
      }
      case EntidadesCrd.NIVEL_ESTUDIO: {
        return firstValueFrom(this.nivelEstudioService.getAll());
      }
      case EntidadesCrd.PROFESION: {
        return firstValueFrom(this.profesionService.getAll());
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

}
