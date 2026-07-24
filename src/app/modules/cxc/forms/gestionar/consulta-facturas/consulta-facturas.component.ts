import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { FacturaEmitirService } from '../../../service/emitir/factura-emitir.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { DetalleSri } from '../../../model/detalle-sri';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { MotivoAnulacionDialogComponent } from '../motivo-anulacion-dialog/motivo-anulacion-dialog.component';

@Component({
  selector: 'app-consulta-facturas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './consulta-facturas.component.html',
  styleUrl: './consulta-facturas.component.scss',
})
export class ConsultaFacturasComponent implements OnInit {
  @ViewChild('fechaDesdeInput', { read: ElementRef }) fechaDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaHastaInput', { read: ElementRef }) fechaHastaInputRef!: ElementRef<HTMLInputElement>;

  private facturaService = inject(FacturaEmitirService);
  private detalleSriService = inject(DetalleSriService);
  private jasperReportes = inject(JasperReportesService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  private get usuarioSesion(): string {
    try {
      const u = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
      if (u) return JSON.parse(u)?.username || JSON.parse(u)?.nombre || JSON.parse(u)?.login || 'sistema';
    } catch { /* */ }
    return 'sistema';
  }

  imprimiendo = signal(false);

  cargando = signal(false);
  estados = signal<Array<{ value: string; label: string }>>([]);

  fechaDesdeControl = new UntypedFormControl(null);
  fechaHastaControl = new UntypedFormControl(null);
  numeroAutorizacion = '';
  cliente = '';
  estado: number | '' = '';

  private _rawFechaDesde = '';
  private _rawFechaHasta = '';

  registros: FacturaEmitir[] = [];
  dataSource = new MatTableDataSource<FacturaEmitir>([]);
  columnas = [
    'numero',
    'clienteIdentificacion',
    'clienteNombre',
    'fecha',
    'autorizacion',
    'subtotal',
    'subtotal5',
    'subcero',
    'viva5',
    'piva',
    'viva',
    'total',
    'estadoEmision',
    'acciones',
  ];

  ngOnInit(): void {
    this.cargarEstados();
    this.buscar();
  }

  private cargarEstados(): void {
    this.detalleSriService.getAll().subscribe({
      next: (detalles) => {
        // LSRI 603 = Estados de emisión
        const LSRI_ESTADOS = '603';
        const estadosFiltered = (detalles || [])
          .filter((d) => d.estado === 1 && this.getTablaCodigo(d.lsri) === LSRI_ESTADOS)
          .map((d) => ({
            value: d.codigo,
            label: d.detalle,
          }))
          .sort((a, b) => {
            const valA = Number(a.value);
            const valB = Number(b.value);
            return valA - valB;
          });
        this.estados.set(estadosFiltered);
      },
      error: () => {
        this.mostrarError('No se pudieron cargar los estados');
        this.estados.set([]);
      },
    });
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) {
      return String(lsri.tabla);
    }
    if (typeof lsri === 'number') {
      return String(lsri);
    }
    return '';
  }

  buscar(): void {
    this.cargando.set(true);
    this.facturaService.getAll().subscribe({
      next: (data) => {
        const todos = (data || []).map((item) => this.normalizar(item));
        const filtrados = this.aplicarFiltros(todos);
        this.registros = filtrados.sort((a, b) => (b.id || 0) - (a.id || 0));
        this.dataSource.data = this.registros;
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mostrarError('No se pudieron consultar las facturas');
      },
    });
  }

  limpiarFiltros(): void {
    this.fechaDesdeControl.setValue(null, { emitEvent: false });
    this.fechaHastaControl.setValue(null, { emitEvent: false });
    this.numeroAutorizacion = '';
    this.cliente = '';
    this.estado = '';
    setTimeout(() => {
      if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = '';
      if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = '';
    });
    this.buscar();
  }

  capturarFechaDesdeRaw(event: Event): void {
    this._rawFechaDesde = (event.target as HTMLInputElement).value;
  }

  syncFechaDesdeFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaDesde || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaDesde = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.fechaDesdeControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaDesdePickerChange(date: Date | null | undefined): void {
    this.fechaDesdeControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaHastaRaw(event: Event): void {
    this._rawFechaHasta = (event.target as HTMLInputElement).value;
  }

  syncFechaHastaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaHasta || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaHasta = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.fechaHastaControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaHastaPickerChange(date: Date | null | undefined): void {
    this.fechaHastaControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted;
    });
  }

  anular(row: FacturaEmitir): void {
    if (Number(row.estadoEmision) === 3) {
      this.mostrarInfo('La factura ya está anulada');
      return;
    }

    const dialogRef = this.dialog.open(MotivoAnulacionDialogComponent, {
      width: '480px',
      disableClose: true,
      data: { numero: row.numero || String(row.id) },
    });

    dialogRef.afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.facturaService.anularFactura({
        idFactura: Number(row.id),
        usuario: this.usuarioSesion,
        motivo,
      }).subscribe({
        next: () => {
          this.mostrarExito('Factura anulada correctamente');
          this.buscar();
        },
        error: () => this.mostrarError('No se pudo anular la factura'),
      });
    });
  }

  autorizar(row: FacturaEmitir): void {
    if (!this.puedeAutorizar(row)) {
      this.mostrarInfo('Solo se puede autorizar facturas en estado pendiente');
      return;
    }

    this.facturaService.reintentarAutorizacion({ idFactura: Number(row.id) }).subscribe({
      next: () => {
        this.mostrarExito('Reintento de autorización enviado');
        this.buscar();
      },
      error: () => this.mostrarError('No se pudo reintentar la autorización'),
    });
  }

  reenviarMail(row: FacturaEmitir): void {
    if (!this.puedeEmitida(row)) {
      this.mostrarInfo('Solo se puede reenviar mail para facturas en estado emitida');
      return;
    }

    const correoTitular = this.obtenerCorreoTitular(row);
    const ingresado = window.prompt(
      'Ingrese correos separados por ;',
      correoTitular
    );

    if (ingresado === null) {
      return;
    }

    const destinatarios = ingresado
      .split(';')
      .map((correo) => correo.trim())
      .filter((correo) => correo.length > 0);

    if (destinatarios.length === 0) {
      this.mostrarInfo('Debe ingresar al menos un correo');
      return;
    }

    const correoInvalido = destinatarios.find((correo) => !this.esCorreoValido(correo));
    if (correoInvalido) {
      this.mostrarError(`Correo inválido: ${correoInvalido}`);
      return;
    }

    this.facturaService
      .reenviarEmail({
        idFactura: Number(row.id),
        destinatarios: destinatarios.join(';'),
      })
      .subscribe({
        next: () => this.mostrarExito('Reenvío de correo solicitado'),
        error: () => this.mostrarError('No se pudo reenviar el correo'),
      });
  }

  puedeAutorizar(row: FacturaEmitir): boolean {
    const codigo = String(Number(row.estadoEmision));
    const estadoMapeado = this.estados().find((e) => e.value === codigo);

    if (!estadoMapeado?.label) {
      return false;
    }

    const label = estadoMapeado.label.trim().toLowerCase();
    return /^pendiente\b/.test(label);
  }

  puedeEmitida(row: FacturaEmitir): boolean {
    const codigo = String(Number(row.estadoEmision));
    const estadoMapeado = this.estados().find((e) => e.value === codigo);

    if (!estadoMapeado?.label) {
      return false;
    }

    const label = estadoMapeado.label.trim().toLowerCase();
    return /^emitida\b/.test(label);
  }

  copiarClave(row: FacturaEmitir): void {
    if (!this.puedeEmitida(row)) {
      this.mostrarInfo('Solo se puede copiar clave para facturas en estado emitida');
      return;
    }

    const valor = row.autorizacion || row.clave;
    if (!valor) {
      this.mostrarInfo('No existe autorización/clave disponible');
      return;
    }
    navigator.clipboard.writeText(valor).then(() => this.mostrarExito('Clave copiada al portapapeles'));
  }

  imprimir(row: FacturaEmitir): void {
    if (!this.puedeEmitida(row)) {
      this.mostrarInfo('Solo se puede imprimir facturas en estado emitida');
      return;
    }

    this.imprimiendo.set(true);
    this.jasperReportes.generar('cxc', 'RPRT_RIDE_FACTURA', { P_ID_FACTURA: row.id }, 'PDF').subscribe({
      next: (blob) => {
        this.imprimiendo.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: () => {
        this.imprimiendo.set(false);
        this.mostrarError('No se pudo generar el reporte');
      },
    });
  }

  estadoLabel(estado: number | null | undefined): string {
    const codigo = String(estado || '');
    const encontrado = this.estados().find((e) => e.value === codigo);
    return encontrado?.label || `Estado ${codigo || 'desconocido'}`;
  }

  private normalizar(item: FacturaEmitir): FacturaEmitir {
    return {
      ...item,
      subtotal: this.toNumber(item.subtotal),
      subtotal5: this.toNumber(item.subtotal5),
      subcero: this.toNumber(item.subcero),
      vIVA5: this.toNumber(item.vIVA5),
      pIVA: this.toNumber(item.pIVA),
      vIVA: this.toNumber(item.vIVA),
      total: this.toNumber(item.total),
    };
  }

  private aplicarFiltros(data: FacturaEmitir[]): FacturaEmitir[] {
    return data.filter((row) => {
      if (this.numeroAutorizacion.trim()) {
        const autorizacion = String(row.autorizacion || row.clave || '').toLowerCase();
        if (!autorizacion.includes(this.numeroAutorizacion.trim().toLowerCase())) {
          return false;
        }
      }

      if (this.cliente.trim()) {
        const nombre = String(row.titular?.razonSocial || row.titular?.nombre || '').toLowerCase();
        const identificacion = String(row.titular?.identificacion || '').toLowerCase();
        const filtro = this.cliente.trim().toLowerCase();
        if (!nombre.includes(filtro) && !identificacion.includes(filtro)) {
          return false;
        }
      }

      if (this.estado !== '' && Number(row.estadoEmision) !== Number(this.estado)) {
        return false;
      }

      const fecha = this.asDate(row.fecha);
      const fechaDesde: Date | null = this.fechaDesdeControl.value;
      const fechaHasta: Date | null = this.fechaHastaControl.value;
      if (fechaDesde && fecha && this.soloFecha(fecha) < this.soloFecha(fechaDesde)) {
        return false;
      }
      if (fechaHasta && fecha && this.soloFecha(fecha) > this.soloFecha(fechaHasta)) {
        return false;
      }

      return true;
    });
  }

  private asDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private soloFecha(value: Date): number {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private obtenerCorreoTitular(row: FacturaEmitir): string {
    const titular = row.titular as any;
    return String(titular?.email || titular?.mail || '').trim();
  }

  private esCorreoValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  private mostrarExito(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }

  private mostrarInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }

  private mostrarError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4500, panelClass: ['snackbar-error'] });
  }
}
