import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { FormaPagoAplicacion } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { etiquetaOrigenPagoExterno } from '../../../../cxp/model/origen-pago-externo';
import { LoteGeneradoResponse, LotePagoResumen, PagoProgramado } from '../../../../cxp/model/pago-programado';
import { PagoProgramadoService } from '../../../../cxp/service/pago-programado.service';
import { EstadoPagoProgramado } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

/**
 * T2 del circuito de pagos por transferencia
 * (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md §3.2): genera el archivo
 * para el banco a partir de los pagos ya aprobados (`REGISTRADO`). Sale de la
 * antigua pestaña "2. Generar Archivo" de PagosTransferenciaComponent (cxp).
 *
 * Generar el archivo ES la aprobación de envío: no hay paso previo. El
 * archivo puede venir en texto (Internacional) o en `.xlsx` (Pacífico) —
 * eso lo agrega el ÍTEM 4 de esta reorganización, pendiente del WAR nuevo.
 */
@Component({
  selector: 'app-archivo-banco',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './archivo-banco.component.html',
  styleUrl: './archivo-banco.component.scss',
})
export class ArchivoBancoComponent implements OnInit {
  private pagoS = inject(PagoProgramadoService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  cuentasBancarias = signal<CuentaBancaria[]>([]);

  selCuentaOrigen: CuentaBancaria | null = null;
  pagosRegistrados = signal<PagoProgramado[]>([]);
  seleccionados = new Set<number>();
  cargandoSeleccion = signal(false);
  generando = signal(false);
  selError = signal('');
  loteGenerado = signal<LoteGeneradoResponse | null>(null);
  readonly columnasSeleccion = ['check', 'proveedor', 'factura', 'valor', 'fechaProgramada', 'cuentaOrigen'];

  /** Descarga manual por número de lote — sirve para lotes que no son de la sesión en curso. */
  loteManualId: number | null = null;
  descargandoLoteManual = signal(false);

  /** Bandeja de lotes ya generados (GET /pgtr/lotes), más recientes primero. */
  lotes = signal<LotePagoResumen[]>([]);
  cargandoLotes = signal(false);
  errorLotes = signal('');
  descargandoLoteFila = signal<number | null>(null);
  readonly columnasLotes = ['idLote', 'fechaGeneracion', 'nombreArchivo', 'numeroPagos', 'valorTotal', 'cuentaOrigen', 'bancoOrigen', 'acciones'];

  ngOnInit(): void {
    this.cargarCuentasBancarias();
    this.cargarPagosRegistrados();
    this.cargarLotes();
  }

  private cargarCuentasBancarias(): void {
    const idEmpresa = this.idEmpresaSesion();
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter(
            (c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa
          );
        }
        this.cuentasBancarias.set(lista);
      },
      error: () => this.cuentasBancarias.set([]),
    });
  }

  cargarPagosRegistrados(): void {
    this.cargandoSeleccion.set(true);
    this.selError.set('');
    this.seleccionados.clear();

    this.pagoS.listar(this.idEmpresaSesion(), EstadoPagoProgramado.REGISTRADO).subscribe({
      next: (data) => {
        this.pagosRegistrados.set(data ?? []);
        this.cargandoSeleccion.set(false);
      },
      error: (err: Error) => {
        this.pagosRegistrados.set([]);
        this.cargandoSeleccion.set(false);
        this.selError.set(err.message);
      },
    });
  }

  /**
   * El backend exige que todos los pagos del lote compartan la cuenta de
   * origen, así que la tabla solo muestra los de la cuenta elegida.
   */
  get pagosFiltrados(): PagoProgramado[] {
    const cuenta = this.selCuentaOrigen;
    if (!cuenta) return [];
    // Un pago con cheque no va en un archivo bancario: el cheque ya se giró
    // al registrarlo, igual que el débito automático nunca pasa por lote.
    return this.pagosRegistrados().filter(
      (p) => p.cuentaBancaria?.codigo === cuenta.codigo
        && p.formaPago !== FormaPagoAplicacion.CHEQUE
    );
  }

  onCambioCuentaOrigen(): void {
    this.seleccionados.clear();
    this.loteGenerado.set(null);
  }

  estaSeleccionado(pago: PagoProgramado): boolean {
    return this.seleccionados.has(pago.id);
  }

  alternarSeleccion(pago: PagoProgramado): void {
    if (this.seleccionados.has(pago.id)) {
      this.seleccionados.delete(pago.id);
    } else {
      this.seleccionados.add(pago.id);
    }
  }

  get todosSeleccionados(): boolean {
    const filas = this.pagosFiltrados;
    return filas.length > 0 && filas.every((p) => this.seleccionados.has(p.id));
  }

  alternarTodos(): void {
    if (this.todosSeleccionados) {
      this.seleccionados.clear();
    } else {
      this.pagosFiltrados.forEach((p) => this.seleccionados.add(p.id));
    }
  }

  get totalSeleccionado(): number {
    return this.pagosFiltrados
      .filter((p) => this.seleccionados.has(p.id))
      .reduce((suma, p) => suma + (Number(p.valor) || 0), 0);
  }

  /** Generar el archivo ES la aprobación de envío: no hay un paso previo. */
  generarArchivo(): void {
    if (!this.selCuentaOrigen || this.seleccionados.size === 0) return;

    this.generando.set(true);
    this.selError.set('');
    this.loteGenerado.set(null);

    this.pagoS.generarLote({
      idsPagos: Array.from(this.seleccionados),
      idCuentaOrigen: this.selCuentaOrigen.codigo,
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.generando.set(false);
        this.loteGenerado.set(resp);
        this.descargarArchivo(resp);
        this.cargarPagosRegistrados();
        this.cargarLotes();
        this.snackBar.open(resp.mensaje ?? 'Archivo de pagos generado.', 'Cerrar', { duration: 5000 });
      },
      error: (err: Error) => {
        this.generando.set(false);
        this.selError.set(err.message);
      },
    });
  }

  /**
   * Dispara la descarga en el navegador a partir del contenido del lote.
   *
   * Regla del contrato (docs/pagos/API-PAGOS-TESORERIA.md §3): si viene
   * `contenidoBase64` se usa ese — decodificado a bytes, nunca como string
   * pelado, porque el texto del Internacional es ANSI (windows-1252) y
   * `atob()` a secas se reinterpreta como UTF-8 y rompe tildes/ñ. Si no
   * viene, se cae a `contenido` como texto (respaldo).
   */
  descargarArchivo(lote: LoteGeneradoResponse): void {
    let blob: Blob;

    if (lote?.contenidoBase64) {
      const binario = atob(lote.contenidoBase64);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
      blob = new Blob([bytes], { type: lote.mimeType || 'application/octet-stream' });
    } else if (lote?.contenido) {
      blob = new Blob([lote.contenido], { type: lote.mimeType || 'text/plain' });
    } else {
      this.snackBar.open('El lote no trae contenido para descargar.', 'Cerrar', { duration: 5000 });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lote.nombreArchivo || `PAGOS_${lote.idLote}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  redescargarLote(idLote: number): void {
    this.pagoS.getArchivoLote(idLote).subscribe({
      next: (lote) => this.descargarArchivo(lote),
      error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
    });
  }

  /**
   * Descarga por número de lote tecleado a mano — para llegar a un lote que no
   * es el de la sesión en curso (p. ej. uno de ayer). Reusa `getArchivoLote` +
   * `descargarArchivo`, el mismo camino que `redescargarLote`: `GET
   * /pgtr/lote/{id}/archivo` reformatea desde cero en cada llamada, así que
   * con el WAR corregido el mismo lote ya sale bien sin regenerar nada.
   */
  descargarLotePorNumero(): void {
    const idLote = this.loteManualId;
    if (!idLote) return;

    this.descargandoLoteManual.set(true);
    this.pagoS.getArchivoLote(idLote).subscribe({
      next: (lote) => {
        this.descargandoLoteManual.set(false);
        this.descargarArchivo(lote);
      },
      error: (err: Error) => {
        this.descargandoLoteManual.set(false);
        this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
      },
    });
  }

  /** GET /pgtr/lotes — bandeja de lotes ya generados, más recientes primero. */
  cargarLotes(): void {
    this.cargandoLotes.set(true);
    this.errorLotes.set('');
    this.pagoS.listarLotes({ idEmpresa: this.idEmpresaSesion() }).subscribe({
      next: (data) => {
        this.lotes.set(Array.isArray(data) ? data : []);
        this.cargandoLotes.set(false);
      },
      error: (err: Error) => {
        this.lotes.set([]);
        this.cargandoLotes.set(false);
        this.errorLotes.set(err.message);
      },
    });
  }

  /** Descarga desde una fila de la bandeja de lotes — mismo camino que `redescargarLote`. */
  descargarLoteDeFila(lote: LotePagoResumen): void {
    this.descargandoLoteFila.set(lote.idLote);
    this.pagoS.getArchivoLote(lote.idLote).subscribe({
      next: (archivo) => {
        this.descargandoLoteFila.set(null);
        this.descargarArchivo(archivo);
      },
      error: (err: Error) => {
        this.descargandoLoteFila.set(null);
        this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
      },
    });
  }

  /** T3 junta carga de respuesta y confirmación manual: un solo destino para ambas. */
  irAConfirmacion(idLote: number): void {
    this.router.navigate(['/menutesoreria/pagos/confirmacion'], { queryParams: { idLote } });
  }

  irAConsulta(): void {
    this.router.navigate(['/menutesoreria/pagos/consulta']);
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  conceptoPago(pago: PagoProgramado): string {
    if (pago.origenExterno) {
      const etiqueta = etiquetaOrigenPagoExterno(pago.origenExterno);
      return pago.idOrigen != null ? `${etiqueta} #${pago.idOrigen}` : etiqueta;
    }
    return pago.facturaCompra?.numero || pago.egreso?.descripcion || '—';
  }

  nombreBeneficiario(pago: PagoProgramado): string {
    return pago.titular?.nombre || pago.beneficiarioNombre || '—';
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
