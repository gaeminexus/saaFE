import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { ComprobanteViewerComponent } from '../../../dialog/cobros/comprobante-viewer.component';
import { EstadoCobro, nombreEstadoCobro, nombreTipoOperacionCobro } from '../../../model/cobros/catalogos-cobro';
import { CobroCredito, RespuestaCobroCreditoDetalle } from '../../../model/cobros/cobro-credito';
import { CobroCreditoService } from '../../../service/cobro-credito.service';

/**
 * Consulta de cobros PROCESADOS y ANULADOS (docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md).
 *
 * Nace de una brecha real: `bandeja-contabilidad` solo trae los REGISTRADOS
 * (`bandejaAprobacion()`) y `proceso-credito` solo los APROBADOS y RECHAZADOS
 * (`bandeja/2`, `bandeja/4`). Un cobro PROCESADO (3) o ANULADO (5) — es decir, terminado — no
 * tenía ninguna pantalla que lo mostrara: existía en la base y era invisible en la UI. No bloquea
 * operar, pero sí bloquea soporte y auditoría ("¿qué pasó con el pago de este socio?").
 *
 * Trae `bandeja/3` y `bandeja/5` (los dos únicos estados terminales de CBCR) por separado y los
 * combina en una sola lista — mismo layout de `bandeja-contabilidad` (lista + panel de detalle),
 * con una insignia de estado en vez de la de tipo. `GET /cbcr/bandeja/{estado}` es genérico
 * (`CobroCreditoDaoService.selectByEstado`, sin restricción de qué estados acepta — verificado en
 * `CobroCreditoRest.java`), así que no hace falta ningún endpoint nuevo.
 *
 * Nunca trae filas `CARGA_PETRO`: ese tipo de cobro NO es un `CobroCredito` — vive en una tabla
 * distinta (CRAR), con su propio ciclo de confirmación/reverso
 * (docs/crd/API-COBRO-PETRO-DOS-PASOS.md). `CrdTipoOperacionCobro` (saaBE) es un catálogo cerrado
 * de 7 valores y ninguno es "CARGA_PETRO" — estructuralmente no puede aparecer acá.
 *
 * ⚠️ Pantalla de SOLO CONSULTA a propósito: un cobro PROCESADO ya movió plata y uno ANULADO ya se
 * reversó. No hay ningún botón de acción — aprobar/rechazar/reversar/reprocesar no tienen sentido
 * sobre un estado terminal, y ofrecerlos invitaría a un doble movimiento.
 */
@Component({
  selector: 'app-consulta-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatButtonToggleModule, ComprobanteViewerComponent],
  templateUrl: './consulta-cobros.component.html',
  styleUrl: './consulta-cobros.component.scss',
})
export class ConsultaCobrosComponent {
  private cobros = inject(CobroCreditoService);
  private funcionesDatos = inject(FuncionesDatosService);

  readonly EstadoCobro = EstadoCobro;
  readonly nombreTipoOperacionCobro = nombreTipoOperacionCobro;
  readonly nombreEstadoCobro = nombreEstadoCobro;

  cargando = signal(false);
  filas = signal<CobroCredito[]>([]);
  filaSeleccionada = signal<CobroCredito | null>(null);

  cargandoDetalle = signal(false);
  detalle = signal<RespuestaCobroCreditoDetalle | null>(null);
  errorDetalle = signal<string | null>(null);

  filtroTexto = '';
  /** null = ambos estados. */
  filtroEstado = signal<number | null>(null);

  totalCargado = computed(() => this.filas().length);

  filasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const texto = this.filtroTexto.trim().toLowerCase();
    return this.filas().filter((f) => {
      if (estado != null && Number(f.estado) !== estado) return false;
      if (!texto) return true;
      const nombre = (f.entidad?.razonSocial ?? '').toLowerCase();
      const referencia = (f.referencia ?? '').toLowerCase();
      return nombre.includes(texto) || referencia.includes(texto) || String(f.codigo).includes(texto);
    });
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.filaSeleccionada.set(null);
    this.detalle.set(null);

    let restantes = 2;
    const combinadas: CobroCredito[] = [];
    const terminar = () => {
      restantes -= 1;
      if (restantes > 0) return;
      combinadas.sort((a, b) => this.fechaOrden(b.fecha) - this.fechaOrden(a.fecha));
      this.filas.set(combinadas);
      this.cargando.set(false);
    };

    this.cobros.bandeja(EstadoCobro.PROCESADO).subscribe((lista) => {
      combinadas.push(...lista);
      terminar();
    });
    this.cobros.bandeja(EstadoCobro.ANULADO).subscribe((lista) => {
      combinadas.push(...lista);
      terminar();
    });
  }

  seleccionar(fila: CobroCredito): void {
    this.filaSeleccionada.set(fila);
    this.detalle.set(null);
    this.errorDetalle.set(null);
    this.cargandoDetalle.set(true);

    this.cobros.getId(fila.codigo).subscribe((resp) => {
      this.cargandoDetalle.set(false);
      if (!resp) {
        this.errorDetalle.set('No se pudo cargar el detalle de este cobro.');
        return;
      }
      this.detalle.set(resp);
    });
  }

  /** Préstamo #idAsoprep, o el tipo de aporte, según a cuál corresponda la línea. */
  nombreLineaDetalle(linea: RespuestaCobroCreditoDetalle['detalle'][number]): string {
    if (linea.prestamo) return `Préstamo #${linea.prestamo.idAsoprep ?? linea.prestamo.codigo}`;
    if (linea.tipoAporte) return linea.tipoAporte.nombre;
    return '—';
  }

  private fechaOrden(fecha: unknown): number {
    return this.funcionesDatos.convertirFechaDesdeBackend(fecha as never)?.getTime() ?? 0;
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }
}
