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
// Servicios de Entidades Principales
import { AdjuntoService } from '../../../modules/crd/service/adjunto.service';
import { AporteService } from '../../../modules/crd/service/aporte.service';
import { AuditoriaService } from '../../../modules/crd/service/auditoria.service';
import { BioProfileService } from '../../../modules/crd/service/bio-profile.service';
import { BotOpcionService } from '../../../modules/crd/service/bot-opcion.service';
import { CambioAporteService } from '../../../modules/crd/service/cambio-aporte.service';
import { CantonService } from '../../../modules/crd/service/canton.service';
import { CargaArchivoService } from '../../../modules/crd/service/carga-archivo.service';
import { CesantiaService } from '../../../modules/crd/service/cesantia.service';
import { CiudadService } from '../../../modules/crd/service/ciudad.service';
import { ComentarioService } from '../../../modules/crd/service/comentario.service';
import { ContratoService } from '../../../modules/crd/service/contrato.service';
import { CreditoMontoAprobacionService } from '../../../modules/crd/service/credito-monto-aprobacion.service';
import { CxcKardexParticipeService } from '../../../modules/crd/service/cxc-kardex-participe.service';
import { CxcParticipeService } from '../../../modules/crd/service/cxc-participe.service';
import { DatosPrestamoService } from '../../../modules/crd/service/datos-prestamo.service';
import { DetalleCargaArchivoService } from '../../../modules/crd/service/detalle-carga-archivo.service';
import { DetallePrestamoService } from '../../../modules/crd/service/detalle-prestamo.service';
import { DireccionService } from '../../../modules/crd/service/direccion.service';
import { DireccionTrabajoService } from '../../../modules/crd/service/direccion-trabajo.service';
import { DocumentoCreditoService } from '../../../modules/crd/service/documento-credito.service';
import { EntidadService } from '../../../modules/crd/service/entidad.service';
import { ExterService } from '../../../modules/crd/service/exter.service';
import { FilialService } from '../../../modules/crd/service/filial.service';
import { HistorialSueldoService } from '../../../modules/crd/service/historial-sueldo.service';
import { MoraPrestamoService } from '../../../modules/crd/service/mora-prestamo.service';
import { NovedadCargaService } from '../../../modules/crd/service/novedad-carga.service';
import { PagoAporteService } from '../../../modules/crd/service/pago-aporte.service';
import { PagoPrestamoService } from '../../../modules/crd/service/pago-prestamo.service';
import { PaisService } from '../../../modules/crd/service/pais.service';
import { ParroquiaService } from '../../../modules/crd/service/parroquia.service';
import { ParticipeService } from '../../../modules/crd/service/participe.service';
import { ParticipeXCargaArchivoService } from '../../../modules/crd/service/participe-x-carga-archivo.service';
import { PerfilEconomicoService } from '../../../modules/crd/service/perfil-economico.service';
import { PersonaNaturalService } from '../../../modules/crd/service/persona-natural.service';
import { PrestamoService } from '../../../modules/crd/service/prestamo.service';
import { ProductoService } from '../../../modules/crd/service/producto.service';
import { ProvinciaService } from '../../../modules/crd/service/provincia.service';
import { RelacionPrestamoService } from '../../../modules/crd/service/relacion-prestamo.service';
import { RequisitosPrestamoService } from '../../../modules/crd/service/requisitos-prestamo.service';
import { TasaPrestamoService } from '../../../modules/crd/service/tasa-prestamo.service';
import { TipoHidrocarburificaService } from '../../../modules/crd/service/tipo-hidrocarburifica.service';
import { TipoPagoService } from '../../../modules/crd/service/tipo-pago.service';
// Modelos de Entidades Principales
import { Adjunto } from '../../../modules/crd/model/adjunto';
import { Aporte } from '../../../modules/crd/model/aporte';
import { Auditoria } from '../../../modules/crd/model/auditoria';
import { BioProfile } from '../../../modules/crd/model/bio-profile';
import { BotOpcion } from '../../../modules/crd/model/bot-opcion';
import { CambioAporte } from '../../../modules/crd/model/cambio-aporte';
import { Canton } from '../../../modules/crd/model/canton';
import { CargaArchivo } from '../../../modules/crd/model/carga-archivo';
import { Cesantia } from '../../../modules/crd/model/cesantia';
import { Ciudad } from '../../../modules/crd/model/ciudad';
import { Comentario } from '../../../modules/crd/model/comentario';
import { Contrato } from '../../../modules/crd/model/contrato';
import { CreditoMontoAprobacion } from '../../../modules/crd/model/credito-monto-aprobacion';
import { CxcKardexParticipe } from '../../../modules/crd/model/cxc-kardex-participe';
import { CxcParticipe } from '../../../modules/crd/model/cxc-participe';
import { DatosPrestamo } from '../../../modules/crd/model/datos-prestamo';
import { DetalleCargaArchivo } from '../../../modules/crd/model/detalle-carga-archivo';
import { DetallePrestamo } from '../../../modules/crd/model/detalle-prestamo';
import { Direccion } from '../../../modules/crd/model/direccion';
import { DireccionTrabajo } from '../../../modules/crd/model/direccion-trabajo';
import { DocumentoCredito } from '../../../modules/crd/model/documento-credito';
import { Entidad } from '../../../modules/crd/model/entidad';
import { Exter } from '../../../modules/crd/model/exter';
import { Filial } from '../../../modules/crd/model/filial';
import { HistorialSueldo } from '../../../modules/crd/model/historial-sueldo';
import { MoraPrestamo } from '../../../modules/crd/model/mora-prestamo';
import { NovedadCarga } from '../../../modules/crd/model/novedad-carga';
import { PagoAporte } from '../../../modules/crd/model/pago-aporte';
import { PagoPrestamo } from '../../../modules/crd/model/pago-prestamo';
import { Pais } from '../../../modules/crd/model/pais';
import { Parroquia } from '../../../modules/crd/model/parroquia';
import { Participe } from '../../../modules/crd/model/participe';
import { ParticipeXCargaArchivo } from '../../../modules/crd/model/participe-x-carga-archivo';
import { PerfilEconomico } from '../../../modules/crd/model/perfil-economico';
import { PersonaNatural } from '../../../modules/crd/model/persona-natural';
import { Prestamo } from '../../../modules/crd/model/prestamo';
import { Producto } from '../../../modules/crd/model/producto';
import { Provincia } from '../../../modules/crd/model/provincia';
import { RelacionPrestamo } from '../../../modules/crd/model/relacion-prestamo';
import { RequisitosPrestamo } from '../../../modules/crd/model/requisitos-prestamo';
import { TasaPrestamo } from '../../../modules/crd/model/tasa-prestamo';
import { TipoHidrocarburifica } from '../../../modules/crd/model/tipo-hidrocarburifica';
import { TipoPago } from '../../../modules/crd/model/tipo-pago';

/**
 * Service Locator para operaciones CRUD centralizadas del módulo CRD
 *
 * Cobertura de Entidades (61 de 65 implementadas):
 * ✅ Implementadas: 61 entidades con servicios CRUD completos
 *    - Estados: ESTADO_PARTICIPE, ESTADO_PRESTAMO, ESTADO_CESANTIA, ESTADO_CIVIL
 *    - Tipos: 13 tipos (TIPO_CONTRATO, TIPO_PARTICIPE, TIPO_PRESTAMO, etc.)
 *    - Listados: MOTIVO_PRESTAMO, METODO_PAGO, NIVEL_ESTUDIO, PROFESION
 *    - Entidades principales: PARTICIPE, PRESTAMO, CONTRATO, APORTE, etc.
 *    - Geográficas: PAIS, PROVINCIA, CANTON, CIUDAD, PARROQUIA
 *    - Financieras: CREDITO_MONTO_APROBACION, MORA_PRESTAMO, TASA_PRESTAMO, etc.
 *    - Auxiliares: ADJUNTO, DIRECCION, COMENTARIO, DOCUMENTO_CREDITO, etc.
 *
 * ⏳ Pendientes (3 entidades sin servicio creado):
 *    - BANCO (403): Servicio pendiente
 *    - CUENTA_ASOPREP (414): Servicio pendiente
 *    - DATOS_PAGO (417): Servicio pendiente
 *
 * ⚠️ Especiales (1 entidad con servicio no-CRUD):
 *    - NOVEDAD_CARGA (436): Servicio especializado sin métodos add/update/delete/getAll
 *
 * @usage
 * ```typescript
 * // Ejecutar operación CRUD
 * await serviceLocator.ejecutaServicio(
 *   EntidadesCrd.PRODUCTO,
 *   producto,
 *   AccionesGrid.ADD
 * );
 *
 * // Recargar catálogo
 * const productos = await serviceLocator.recargarValores(EntidadesCrd.PRODUCTO);
 * ```
 */
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
    public tipoHidrocarburificaService: TipoHidrocarburificaService,
    public tipoPagoService: TipoPagoService,
    // Servicios de Listados
    public motivoPrestamoService: MotivoPrestamoService,
    public metodoPagoService: MetodoPagoService,
    public nivelEstudioService: NivelEstudioService,
    public profesionService: ProfesionService,
    // Servicios de Entidades Principales
    public adjuntoService: AdjuntoService,
    public aporteService: AporteService,
    public auditoriaService: AuditoriaService,
    public bioProfileService: BioProfileService,
    public botOpcionService: BotOpcionService,
    public cambioAporteService: CambioAporteService,
    public cantonService: CantonService,
    public cargaArchivoService: CargaArchivoService,
    public cesantiaService: CesantiaService,
    public ciudadService: CiudadService,
    public comentarioService: ComentarioService,
    public contratoService: ContratoService,
    public creditoMontoAprobacionService: CreditoMontoAprobacionService,
    public cxcKardexParticipeService: CxcKardexParticipeService,
    public cxcParticipeService: CxcParticipeService,
    public datosPrestamoService: DatosPrestamoService,
    public detalleCargaArchivoService: DetalleCargaArchivoService,
    public detallePrestamoService: DetallePrestamoService,
    public direccionService: DireccionService,
    public direccionTrabajoService: DireccionTrabajoService,
    public documentoCreditoService: DocumentoCreditoService,
    public entidadService: EntidadService,
    public exterService: ExterService,
    public filialService: FilialService,
    public historialSueldoService: HistorialSueldoService,
    public moraPrestamoService: MoraPrestamoService,
    public novedadCargaService: NovedadCargaService,
    public pagoAporteService: PagoAporteService,
    public pagoPrestamoService: PagoPrestamoService,
    public paisService: PaisService,
    public parroquiaService: ParroquiaService,
    public participeService: ParticipeService,
    public participeXCargaArchivoService: ParticipeXCargaArchivoService,
    public perfilEconomicoService: PerfilEconomicoService,
    public personaNaturalService: PersonaNaturalService,
    public prestamoService: PrestamoService,
    public productoService: ProductoService,
    public provinciaService: ProvinciaService,
    public relacionPrestamoService: RelacionPrestamoService,
    public requisitosPrestamoService: RequisitosPrestamoService,
    public tasaPrestamoService: TasaPrestamoService,
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
      // ========== ENTIDADES PRINCIPALES ==========
      case EntidadesCrd.ADJUNTO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Adjunto;
            this.reg.idEstado = 1;
            return firstValueFrom(this.adjuntoService.add(this.reg as Adjunto));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Adjunto;
            return firstValueFrom(this.adjuntoService.update(this.reg as Adjunto));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.adjuntoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.APORTE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Aporte;
            this.reg.idEstado = 1;
            return firstValueFrom(this.aporteService.add(this.reg as Aporte));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Aporte;
            return firstValueFrom(this.aporteService.update(this.reg as Aporte));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.aporteService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.AUDITORIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Auditoria;
            this.reg.idEstado = 1;
            return firstValueFrom(this.auditoriaService.add(this.reg as Auditoria));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Auditoria;
            return firstValueFrom(this.auditoriaService.update(this.reg as Auditoria));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.auditoriaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.BIO_PROFILE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as BioProfile;
            this.reg.idEstado = 1;
            return firstValueFrom(this.bioProfileService.add(this.reg as BioProfile));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as BioProfile;
            return firstValueFrom(this.bioProfileService.update(this.reg as BioProfile));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.bioProfileService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.BOT_OPCION: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as BotOpcion;
            this.reg.idEstado = 1;
            return firstValueFrom(this.botOpcionService.add(this.reg as BotOpcion));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as BotOpcion;
            return firstValueFrom(this.botOpcionService.update(this.reg as BotOpcion));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.botOpcionService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CAMBIO_APORTE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as CambioAporte;
            this.reg.idEstado = 1;
            return firstValueFrom(this.cambioAporteService.add(this.reg as CambioAporte));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as CambioAporte;
            return firstValueFrom(this.cambioAporteService.update(this.reg as CambioAporte));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.cambioAporteService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CANTON: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Canton;
            this.reg.idEstado = 1;
            return firstValueFrom(this.cantonService.add(this.reg as Canton));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Canton;
            return firstValueFrom(this.cantonService.update(this.reg as Canton));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.cantonService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CARGA_ARCHIVO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as CargaArchivo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.cargaArchivoService.add(this.reg as CargaArchivo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as CargaArchivo;
            return firstValueFrom(this.cargaArchivoService.update(this.reg as CargaArchivo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.cargaArchivoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CESANTIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Cesantia;
            this.reg.idEstado = 1;
            return firstValueFrom(this.cesantiaService.add(this.reg as Cesantia));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Cesantia;
            return firstValueFrom(this.cesantiaService.update(this.reg as Cesantia));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.cesantiaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CIUDAD: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Ciudad;
            this.reg.idEstado = 1;
            return firstValueFrom(this.ciudadService.add(this.reg as Ciudad));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Ciudad;
            return firstValueFrom(this.ciudadService.update(this.reg as Ciudad));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.ciudadService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.COMENTARIO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Comentario;
            this.reg.idEstado = 1;
            return firstValueFrom(this.comentarioService.add(this.reg as Comentario));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Comentario;
            return firstValueFrom(this.comentarioService.update(this.reg as Comentario));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.comentarioService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CONTRATO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Contrato;
            this.reg.idEstado = 1;
            return firstValueFrom(this.contratoService.add(this.reg as Contrato));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Contrato;
            return firstValueFrom(this.contratoService.update(this.reg as Contrato));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.contratoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CREDITO_MONTO_APROBACION: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as CreditoMontoAprobacion;
            this.reg.idEstado = 1;
            return firstValueFrom(this.creditoMontoAprobacionService.add(this.reg as CreditoMontoAprobacion));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as CreditoMontoAprobacion;
            return firstValueFrom(this.creditoMontoAprobacionService.update(this.reg as CreditoMontoAprobacion));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.creditoMontoAprobacionService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CXC_KARDEX_PARTICIPE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as CxcKardexParticipe;
            this.reg.idEstado = 1;
            return firstValueFrom(this.cxcKardexParticipeService.add(this.reg as CxcKardexParticipe));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as CxcKardexParticipe;
            return firstValueFrom(this.cxcKardexParticipeService.update(this.reg as CxcKardexParticipe));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.cxcKardexParticipeService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.CXC_PARTICIPE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as CxcParticipe;
            this.reg.idEstado = 1;
            return firstValueFrom(this.cxcParticipeService.add(this.reg as CxcParticipe));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as CxcParticipe;
            return firstValueFrom(this.cxcParticipeService.update(this.reg as CxcParticipe));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.cxcParticipeService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.DATOS_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as DatosPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.datosPrestamoService.add(this.reg as DatosPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as DatosPrestamo;
            return firstValueFrom(this.datosPrestamoService.update(this.reg as DatosPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.datosPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.DETALLE_CARGA_ARCHIVO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as DetalleCargaArchivo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.detalleCargaArchivoService.add(this.reg as DetalleCargaArchivo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as DetalleCargaArchivo;
            return firstValueFrom(this.detalleCargaArchivoService.update(this.reg as DetalleCargaArchivo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.detalleCargaArchivoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.DETALLE_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as DetallePrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.detallePrestamoService.add(this.reg as DetallePrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as DetallePrestamo;
            return firstValueFrom(this.detallePrestamoService.update(this.reg as DetallePrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.detallePrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.DIRECCION: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Direccion;
            this.reg.idEstado = 1;
            return firstValueFrom(this.direccionService.add(this.reg as Direccion));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Direccion;
            return firstValueFrom(this.direccionService.update(this.reg as Direccion));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.direccionService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.DIRECCION_TRABAJO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as DireccionTrabajo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.direccionTrabajoService.add(this.reg as DireccionTrabajo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as DireccionTrabajo;
            return firstValueFrom(this.direccionTrabajoService.update(this.reg as DireccionTrabajo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.direccionTrabajoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.DOCUMENTO_CREDITO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as DocumentoCredito;
            this.reg.idEstado = 1;
            return firstValueFrom(this.documentoCreditoService.add(this.reg as DocumentoCredito));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as DocumentoCredito;
            return firstValueFrom(this.documentoCreditoService.update(this.reg as DocumentoCredito));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.documentoCreditoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ENTIDAD: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Entidad;
            this.reg.idEstado = 1;
            return firstValueFrom(this.entidadService.add(this.reg as Entidad));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Entidad;
            return firstValueFrom(this.entidadService.update(this.reg as Entidad));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.entidadService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.EXTER: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Exter;
            this.reg.idEstado = 1;
            return firstValueFrom(this.exterService.add(this.reg as Exter));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Exter;
            return firstValueFrom(this.exterService.update(this.reg as Exter));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.exterService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.FILIAL: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Filial;
            this.reg.idEstado = 1;
            return firstValueFrom(this.filialService.add(this.reg as Filial));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Filial;
            return firstValueFrom(this.filialService.update(this.reg as Filial));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.filialService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.HISTORIAL_SUELDO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as HistorialSueldo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.historialSueldoService.add(this.reg as HistorialSueldo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as HistorialSueldo;
            return firstValueFrom(this.historialSueldoService.update(this.reg as HistorialSueldo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.historialSueldoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.MORA_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as MoraPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.moraPrestamoService.add(this.reg as MoraPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as MoraPrestamo;
            return firstValueFrom(this.moraPrestamoService.update(this.reg as MoraPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.moraPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      // NOVEDAD_CARGA: Servicio especializado sin métodos CRUD estándar
      case EntidadesCrd.PAGO_APORTE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as PagoAporte;
            this.reg.idEstado = 1;
            return firstValueFrom(this.pagoAporteService.add(this.reg as PagoAporte));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as PagoAporte;
            return firstValueFrom(this.pagoAporteService.update(this.reg as PagoAporte));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.pagoAporteService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PAGO_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as PagoPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.pagoPrestamoService.add(this.reg as PagoPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as PagoPrestamo;
            return firstValueFrom(this.pagoPrestamoService.update(this.reg as PagoPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.pagoPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PAIS: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Pais;
            this.reg.idEstado = 1;
            return firstValueFrom(this.paisService.add(this.reg as Pais));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Pais;
            return firstValueFrom(this.paisService.update(this.reg as Pais));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.paisService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PARROQUIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Parroquia;
            this.reg.idEstado = 1;
            return firstValueFrom(this.parroquiaService.add(this.reg as Parroquia));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Parroquia;
            return firstValueFrom(this.parroquiaService.update(this.reg as Parroquia));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.parroquiaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PARTICIPE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Participe;
            this.reg.idEstado = 1;
            return firstValueFrom(this.participeService.add(this.reg as Participe));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Participe;
            return firstValueFrom(this.participeService.update(this.reg as Participe));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.participeService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PARTICIPE_X_CARGA_ARCHIVO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as ParticipeXCargaArchivo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.participeXCargaArchivoService.add(this.reg as ParticipeXCargaArchivo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as ParticipeXCargaArchivo;
            return firstValueFrom(this.participeXCargaArchivoService.update(this.reg as ParticipeXCargaArchivo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.participeXCargaArchivoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PERFIL_ECONOMICO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as PerfilEconomico;
            this.reg.idEstado = 1;
            return firstValueFrom(this.perfilEconomicoService.add(this.reg as PerfilEconomico));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as PerfilEconomico;
            return firstValueFrom(this.perfilEconomicoService.update(this.reg as PerfilEconomico));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.perfilEconomicoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PERSONA_NATURAL: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as PersonaNatural;
            this.reg.idEstado = 1;
            return firstValueFrom(this.personaNaturalService.add(this.reg as PersonaNatural));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as PersonaNatural;
            return firstValueFrom(this.personaNaturalService.update(this.reg as PersonaNatural));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.personaNaturalService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Prestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.prestamoService.add(this.reg as Prestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Prestamo;
            return firstValueFrom(this.prestamoService.update(this.reg as Prestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.prestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PRODUCTO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Producto;
            this.reg.idEstado = 1;
            return firstValueFrom(this.productoService.add(this.reg as Producto));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Producto;
            return firstValueFrom(this.productoService.update(this.reg as Producto));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.productoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.PROVINCIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as Provincia;
            this.reg.idEstado = 1;
            return firstValueFrom(this.provinciaService.add(this.reg as Provincia));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as Provincia;
            return firstValueFrom(this.provinciaService.update(this.reg as Provincia));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.provinciaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.RELACION_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as RelacionPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.relacionPrestamoService.add(this.reg as RelacionPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as RelacionPrestamo;
            return firstValueFrom(this.relacionPrestamoService.update(this.reg as RelacionPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.relacionPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.REQUISITOS_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as RequisitosPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.requisitosPrestamoService.add(this.reg as RequisitosPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as RequisitosPrestamo;
            return firstValueFrom(this.requisitosPrestamoService.update(this.reg as RequisitosPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.requisitosPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TASA_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TasaPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tasaPrestamoService.add(this.reg as TasaPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TasaPrestamo;
            return firstValueFrom(this.tasaPrestamoService.update(this.reg as TasaPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tasaPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_HIDROCARBURIFICA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoHidrocarburifica;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoHidrocarburificaService.add(this.reg as TipoHidrocarburifica));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoHidrocarburifica;
            return firstValueFrom(this.tipoHidrocarburificaService.update(this.reg as TipoHidrocarburifica));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoHidrocarburificaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.TIPO_PAGO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as TipoPago;
            this.reg.idEstado = 1;
            return firstValueFrom(this.tipoPagoService.add(this.reg as TipoPago));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as TipoPago;
            return firstValueFrom(this.tipoPagoService.update(this.reg as TipoPago));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.tipoPagoService.delete(value));
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
      // ========== ENTIDADES PRINCIPALES ==========
      case EntidadesCrd.ADJUNTO: {
        return firstValueFrom(this.adjuntoService.getAll());
      }
      case EntidadesCrd.APORTE: {
        return firstValueFrom(this.aporteService.getAll());
      }
      case EntidadesCrd.AUDITORIA: {
        return firstValueFrom(this.auditoriaService.getAll());
      }
      case EntidadesCrd.BIO_PROFILE: {
        return firstValueFrom(this.bioProfileService.getAll());
      }
      case EntidadesCrd.BOT_OPCION: {
        return firstValueFrom(this.botOpcionService.getAll());
      }
      case EntidadesCrd.CAMBIO_APORTE: {
        return firstValueFrom(this.cambioAporteService.getAll());
      }
      case EntidadesCrd.CANTON: {
        return firstValueFrom(this.cantonService.getAll());
      }
      case EntidadesCrd.CARGA_ARCHIVO: {
        return firstValueFrom(this.cargaArchivoService.getAll());
      }
      case EntidadesCrd.CESANTIA: {
        return firstValueFrom(this.cesantiaService.getAll());
      }
      case EntidadesCrd.CIUDAD: {
        return firstValueFrom(this.ciudadService.getAll());
      }
      case EntidadesCrd.COMENTARIO: {
        return firstValueFrom(this.comentarioService.getAll());
      }
      case EntidadesCrd.CONTRATO: {
        return firstValueFrom(this.contratoService.getAll());
      }
      case EntidadesCrd.CREDITO_MONTO_APROBACION: {
        return firstValueFrom(this.creditoMontoAprobacionService.getAll());
      }
      case EntidadesCrd.CXC_KARDEX_PARTICIPE: {
        return firstValueFrom(this.cxcKardexParticipeService.getAll());
      }
      case EntidadesCrd.CXC_PARTICIPE: {
        return firstValueFrom(this.cxcParticipeService.getAll());
      }
      case EntidadesCrd.DATOS_PRESTAMO: {
        return firstValueFrom(this.datosPrestamoService.getAll());
      }
      case EntidadesCrd.DETALLE_CARGA_ARCHIVO: {
        return firstValueFrom(this.detalleCargaArchivoService.getAll());
      }
      case EntidadesCrd.DETALLE_PRESTAMO: {
        return firstValueFrom(this.detallePrestamoService.getAll());
      }
      case EntidadesCrd.DIRECCION: {
        return firstValueFrom(this.direccionService.getAll());
      }
      case EntidadesCrd.DIRECCION_TRABAJO: {
        return firstValueFrom(this.direccionTrabajoService.getAll());
      }
      case EntidadesCrd.DOCUMENTO_CREDITO: {
        return firstValueFrom(this.documentoCreditoService.getAll());
      }
      case EntidadesCrd.ENTIDAD: {
        return firstValueFrom(this.entidadService.getAll());
      }
      case EntidadesCrd.EXTER: {
        return firstValueFrom(this.exterService.getAll());
      }
      case EntidadesCrd.FILIAL: {
        return firstValueFrom(this.filialService.getAll());
      }
      case EntidadesCrd.HISTORIAL_SUELDO: {
        return firstValueFrom(this.historialSueldoService.getAll());
      }
      case EntidadesCrd.MORA_PRESTAMO: {
        return firstValueFrom(this.moraPrestamoService.getAll());
      }
      // NOVEDAD_CARGA: Servicio especializado sin método getAll
      case EntidadesCrd.PAGO_APORTE: {
        return firstValueFrom(this.pagoAporteService.getAll());
      }
      case EntidadesCrd.PAGO_PRESTAMO: {
        return firstValueFrom(this.pagoPrestamoService.getAll());
      }
      case EntidadesCrd.PAIS: {
        return firstValueFrom(this.paisService.getAll());
      }
      case EntidadesCrd.PARROQUIA: {
        return firstValueFrom(this.parroquiaService.getAll());
      }
      case EntidadesCrd.PARTICIPE: {
        return firstValueFrom(this.participeService.getAll());
      }
      case EntidadesCrd.PARTICIPE_X_CARGA_ARCHIVO: {
        return firstValueFrom(this.participeXCargaArchivoService.getAll());
      }
      case EntidadesCrd.PERFIL_ECONOMICO: {
        return firstValueFrom(this.perfilEconomicoService.getAll());
      }
      case EntidadesCrd.PERSONA_NATURAL: {
        return firstValueFrom(this.personaNaturalService.getAll());
      }
      case EntidadesCrd.PRESTAMO: {
        return firstValueFrom(this.prestamoService.getAll());
      }
      case EntidadesCrd.PRODUCTO: {
        return firstValueFrom(this.productoService.getAll());
      }
      case EntidadesCrd.PROVINCIA: {
        return firstValueFrom(this.provinciaService.getAll());
      }
      case EntidadesCrd.RELACION_PRESTAMO: {
        return firstValueFrom(this.relacionPrestamoService.getAll());
      }
      case EntidadesCrd.REQUISITOS_PRESTAMO: {
        return firstValueFrom(this.requisitosPrestamoService.getAll());
      }
      case EntidadesCrd.TASA_PRESTAMO: {
        return firstValueFrom(this.tasaPrestamoService.getAll());
      }
      case EntidadesCrd.TIPO_HIDROCARBURIFICA: {
        return firstValueFrom(this.tipoHidrocarburificaService.getAll());
      }
      case EntidadesCrd.TIPO_PAGO: {
        return firstValueFrom(this.tipoPagoService.getAll());
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

}
