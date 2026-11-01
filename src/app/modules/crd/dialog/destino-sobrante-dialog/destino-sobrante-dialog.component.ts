import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import {
  DESTINO_SOBRANTE,
  DestinoSobrante,
  TIPO_APORTE_CESANTIA,
  TIPO_APORTE_JUBILACION,
} from '../../model/destino-sobrante';
import { EstadoPrestamoOperativo } from '../../model/pagos/catalogos-pago';
import { Prestamo } from '../../model/prestamo';
import { DestinoSobranteService } from '../../service/destino-sobrante.service';
import { EntidadService } from '../../service/entidad.service';
import { PrestamoService } from '../../service/prestamo.service';
import { criterioEntidadPorCodigoPetro } from '../../util/rol-participe';

export interface DestinoSobranteDialogData {
  idCarga: number;
  codigoPetro: number;
  nombre: string;
  /** Destino vigente (estado 1) del partícipe, o null si no eligió. */
  destinoActual: DestinoSobrante | null;
  /** Carga PROCESADA: solo muestra lo elegido y lo aplicado/devuelto. */
  soloLectura: boolean;
}

/** Resultado: 'guardado' | 'anulado' (la pantalla recarga los destinos) o undefined si se cerró sin cambios. */
export type DestinoSobranteDialogResult = 'guardado' | 'anulado';

@Component({
  selector: 'app-destino-sobrante-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './destino-sobrante-dialog.component.html',
  styleUrl: './destino-sobrante-dialog.component.scss',
})
export class DestinoSobranteDialogComponent implements OnInit {
  readonly DESTINO = DESTINO_SOBRANTE;
  readonly tiposAporte = [
    { codigo: TIPO_APORTE_JUBILACION, nombre: 'Jubilación' },
    { codigo: TIPO_APORTE_CESANTIA, nombre: 'Cesantía' },
  ];

  tipoDestino: number | null = null;
  /** null = «automático»: la cuota pendiente más antigua de un préstamo vigente o en mora. */
  codigoPrestamo: number | null = null;
  codigoTipoAporte: number | null = null;
  observacion = '';

  entidadCodigo: number | null = null;
  prestamos = signal<Prestamo[]>([]);
  cargandoContexto = signal(true);
  guardando = signal(false);
  errorContexto = signal('');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DestinoSobranteDialogData,
    private dialogRef: MatDialogRef<DestinoSobranteDialogComponent, DestinoSobranteDialogResult>,
    private destinoService: DestinoSobranteService,
    private entidadService: EntidadService,
    private prestamoService: PrestamoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const actual = this.data.destinoActual;
    if (actual) {
      this.tipoDestino = actual.tipoDestino;
      this.codigoPrestamo = actual.prestamo?.codigo ?? null;
      this.codigoTipoAporte = actual.tipoAporte?.codigo ?? null;
      this.observacion = actual.observacion ?? '';
      this.entidadCodigo = actual.entidad?.codigo ?? null;
    }

    // Carga procesada: no hace falta consultar nada, solo se muestra lo elegido y lo aplicado.
    if (this.esSoloLectura) {
      this.cargandoContexto.set(false);
      return;
    }
    this.resolverEntidadYPrestamos();
  }

  get esSoloLectura(): boolean {
    return this.data.soloLectura;
  }

  /** Entidad del partícipe (por rol Petro) y sus préstamos vigentes o en mora, para el destino 1. */
  private resolverEntidadYPrestamos(): void {
    if (this.entidadCodigo) {
      this.cargarPrestamos(this.entidadCodigo);
      return;
    }

    // ARCH: el codigoPetro puede ser el rol técnico (9000000 + ENTDCDGO), que se resuelve por código.
    this.entidadService.selectByCriteria([criterioEntidadPorCodigoPetro(this.data.codigoPetro)]).subscribe({
      next: (entidades) => {
        const lista = Array.isArray(entidades) ? entidades : entidades ? [entidades] : [];
        const entidad = lista[0];
        if (!entidad?.codigo) {
          this.errorContexto.set('No se encontró la entidad del partícipe: no se puede elegir destino.');
          this.cargandoContexto.set(false);
          return;
        }
        this.entidadCodigo = entidad.codigo;
        this.cargarPrestamos(entidad.codigo);
      },
      error: (error) => {
        this.errorContexto.set(mensajeDeError(error, 'No se pudo consultar la entidad del partícipe'));
        this.cargandoContexto.set(false);
      },
    });
  }

  private cargarPrestamos(entidad: number): void {
    const dbEntidad = new DatosBusqueda();
    dbEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(entidad),
      TipoComandosBusqueda.IGUAL,
    );
    const dbOrden = new DatosBusqueda();
    dbOrden.orderBy('fechaInicio');
    dbOrden.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.prestamoService.selectByCriteria([dbEntidad, dbOrden]).subscribe({
      next: (prestamos) => {
        const lista = Array.isArray(prestamos) ? prestamos : prestamos ? [prestamos] : [];
        // Mismo criterio que la afectación de cuotas: solo VIGENTE y EN_MORA (el plazo vencido no entra).
        this.prestamos.set(
          lista.filter(
            (p) => p?.idEstado === EstadoPrestamoOperativo.VIGENTE || p?.idEstado === EstadoPrestamoOperativo.EN_MORA,
          ),
        );
        this.cargandoContexto.set(false);
      },
      error: (error) => {
        this.errorContexto.set(mensajeDeError(error, 'No se pudieron consultar los préstamos del partícipe'));
        this.cargandoContexto.set(false);
      },
    });
  }

  etiquetaPrestamo(p: Prestamo): string {
    const producto = p.producto?.nombre ? ` · ${p.producto.nombre}` : '';
    return `Préstamo ${p.codigo}${producto}`;
  }

  get puedeGuardar(): boolean {
    if (this.esSoloLectura || this.guardando() || this.cargandoContexto() || !this.entidadCodigo) return false;
    if (this.tipoDestino === DESTINO_SOBRANTE.APORTE) return this.codigoTipoAporte !== null;
    return this.tipoDestino !== null;
  }

  guardar(): void {
    if (!this.puedeGuardar || this.tipoDestino === null || !this.entidadCodigo) return;

    const usuario = usuarioSesion();
    const destino: DestinoSobrante = {
      cargaArchivo: { codigo: this.data.idCarga },
      entidad: { codigo: this.entidadCodigo },
      tipoDestino: this.tipoDestino,
      prestamo: this.tipoDestino === DESTINO_SOBRANTE.SIGUIENTE_CUOTA && this.codigoPrestamo
        ? { codigo: this.codigoPrestamo }
        : null,
      tipoAporte: this.tipoDestino === DESTINO_SOBRANTE.APORTE && this.codigoTipoAporte
        ? { codigo: this.codigoTipoAporte }
        : null,
      observacion: this.observacion.trim() || null,
    };

    this.guardando.set(true);
    // POST: si el partícipe ya tenía un destino activo, el backend anula el anterior y vale el nuevo.
    this.destinoService.add(destino, usuario).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Destino del sobrante guardado', 'Cerrar', { duration: 3500 });
        this.dialogRef.close('guardado');
      },
      error: (error) => {
        this.guardando.set(false);
        this.snackBar.open(mensajeDeError(error, 'No se pudo guardar el destino'), 'Cerrar', { duration: 7000 });
      },
    });
  }

  anular(): void {
    const actual = this.data.destinoActual;
    if (!actual?.codigo || this.esSoloLectura || this.guardando()) return;

    const usuario = usuarioSesion();
    this.guardando.set(true);
    this.destinoService.anular(actual.codigo, usuario).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Destino del sobrante anulado', 'Cerrar', { duration: 3500 });
        this.dialogRef.close('anulado');
      },
      error: (error) => {
        this.guardando.set(false);
        this.snackBar.open(mensajeDeError(error, 'No se pudo anular el destino'), 'Cerrar', { duration: 7000 });
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
