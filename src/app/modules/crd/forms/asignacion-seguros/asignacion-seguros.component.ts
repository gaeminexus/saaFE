import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { AsignarSeguroDialogComponent } from './asignar-seguro-dialog.component';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';

import { AsignacionSeguro, TipoSeguroPrestamo } from '../../model/asignacion-seguro';
import { EstadoParticipe } from '../../model/estado-participe';
import { EstadoPrestamo } from '../../model/estado-prestamo';
import { Prestamo } from '../../model/prestamo';
import { EstadoParticipeService } from '../../service/estado-participe.service';
import { EstadoPrestamoService } from '../../service/estado-prestamo.service';
import { PrestamoService } from '../../service/prestamo.service';

interface TipoSeguroOption {
  key: TipoSeguroPrestamo;
  label: string;
  icon: string;
  regla: string;
}

@Component({
  selector: 'app-asignacion-seguros',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
  ],
  templateUrl: './asignacion-seguros.component.html',
  styleUrl: './asignacion-seguros.component.scss',
})
export class AsignacionSegurosComponent implements OnInit {
  private prestamoService = inject(PrestamoService);
  private estadoPrestamoService = inject(EstadoPrestamoService);
  private estadoParticipeService = inject(EstadoParticipeService);
  private exportService = inject(ExportService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly TIPOS: TipoSeguroOption[] = [
    {
      key: 'INCENDIO',
      label: 'Incendio',
      icon: 'local_fire_department',
      regla: 'Solo préstamos hipotecarios vigentes requieren seguro de incendio (garantía sobre el bien inmueble).',
    },
    {
      key: 'DESGRAVAMEN',
      label: 'Desgravamen',
      icon: 'verified_user',
      regla: 'El seguro de desgravamen aplica a todo préstamo vigente, sin importar el tipo de producto.',
    },
    {
      key: 'PRENDARIO',
      label: 'Prendario',
      icon: 'lock',
      regla: 'Solo préstamos con tipo de préstamo Prendario (tabla PRODUCTO) y vigentes requieren seguro prendario.',
    },
  ];

  displayedColumns = [
    'codigo',
    'idAsoprep',
    'entidad',
    'estadoParticipe',
    'producto',
    'fecha',
    'estadoPrestamo',
    'montoSolicitado',
    'totalPagado',
    'saldoTotal',
  ];

  cargando = signal(true);
  mostrarPrestamos = signal(false);

  private estadosPrestamo = signal<EstadoPrestamo[]>([]);
  private estadosParticipe = signal<EstadoParticipe[]>([]);
  private prestamosVigentes = signal<Prestamo[]>([]);

  activeTabIndex = signal(0);
  tipoActivo = computed<TipoSeguroOption>(() => this.TIPOS[this.activeTabIndex()]);
  activeTab = computed<TipoSeguroPrestamo>(() => this.tipoActivo().key);

  prestamosPorTipo = computed<Record<TipoSeguroPrestamo, Prestamo[]>>(() => {
    const todos = this.prestamosVigentes();
    return {
      INCENDIO: todos.filter((p) => this.esElegible(p, 'INCENDIO')),
      DESGRAVAMEN: todos.filter((p) => this.esElegible(p, 'DESGRAVAMEN')),
      PRENDARIO: todos.filter((p) => this.esElegible(p, 'PRENDARIO')),
    };
  });

  prestamosTabActivo = computed<Prestamo[]>(() => this.prestamosPorTipo()[this.activeTab()]);

  totalSaldoTabActivo = computed<number>(() =>
    this.prestamosTabActivo().reduce((suma, p) => suma + (p.saldoTotal ?? 0), 0),
  );

  // Asignaciones capturadas solo en el cliente: no existe todavía un endpoint de backend para
  // persistir seguros de préstamo (ver modules/crd/model/asignacion-seguro.ts). Este estado se
  // reinicia al recargar o salir de la pantalla. Ahora la asignación es por tipo de seguro, no
  // por préstamo individual.
  private polizasAsignadas = signal<Partial<Record<TipoSeguroPrestamo, AsignacionSeguro>>>({});

  polizaTabActivo = computed<AsignacionSeguro | undefined>(() => this.polizasAsignadas()[this.activeTab()]);

  tieneAsignacion(tipo: TipoSeguroPrestamo): boolean {
    return !!this.polizasAsignadas()[tipo];
  }

  ngOnInit(): void {
    this.cargarDatosBase();
  }

  seleccionarTipo(index: number): void {
    this.activeTabIndex.set(index);
    this.mostrarPrestamos.set(false);
  }

  toggleVerPrestamos(): void {
    this.mostrarPrestamos.update((v) => !v);
  }

  // ================= carga inicial =================

  private cargarDatosBase(): void {
    this.cargando.set(true);
    forkJoin({
      estadosPrestamo: this.estadoPrestamoService.getAll(),
      estadosParticipe: this.estadoParticipeService.getAll(),
    }).subscribe({
      next: (res) => {
        this.estadosPrestamo.set(res.estadosPrestamo ?? []);
        this.estadosParticipe.set(res.estadosParticipe ?? []);
        this.cargarPrestamosVigentes();
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('No se pudieron cargar los catálogos necesarios.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  private cargarPrestamosVigentes(): void {
    const vigente = this.estadosPrestamo().find((e) => (e.nombre || '').toUpperCase().includes('VIGENTE'));

    const criterios: DatosBusqueda[] = [];
    if (vigente) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'idEstado', String(vigente.codigoExterno), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    }

    this.prestamoService.selectByCriteria(criterios).subscribe({
      next: (prestamos) => {
        this.prestamosVigentes.set((prestamos ?? []).filter((p) => this.esVigente(p)));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Ocurrió un error al cargar los préstamos vigentes.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  // ================= elegibilidad por tipo de seguro =================

  private esVigente(p: Prestamo): boolean {
    return this.obtenerEstadoPrestamo(p).toUpperCase().includes('VIGENTE');
  }

  private esHipotecario(p: Prestamo): boolean {
    return (p.producto?.tipoPrestamo?.nombre || '').toUpperCase().includes('HIPOTEC');
  }

  private esPrendario(p: Prestamo): boolean {
    return (p.producto?.tipoPrestamo?.nombre || '').toUpperCase().includes('PRENDA');
  }

  esElegible(p: Prestamo, tipo: TipoSeguroPrestamo): boolean {
    if (tipo === 'INCENDIO') return this.esHipotecario(p);
    if (tipo === 'PRENDARIO') return this.esPrendario(p);
    return true; // DESGRAVAMEN: cualquier tipo de préstamo vigente
  }

  // ================= catálogos: mismos criterios que CRD/Préstamos/Consulta =================

  obtenerEstadoParticipe(p: Prestamo): string {
    const idEstado = p.entidad?.idEstado;
    if (idEstado === undefined || idEstado === null) return '-';
    const estado = this.estadosParticipe().find((e) => e.codigoExterno === idEstado);
    return estado?.nombre || `Estado ${idEstado}`;
  }

  obtenerEstadoPrestamo(p: Prestamo): string {
    const estadoObjeto = typeof p.estadoPrestamo === 'object' && p.estadoPrestamo ? p.estadoPrestamo : null;
    const nombreOriginal: string | undefined = estadoObjeto?.nombre;

    const codigoAltEstado =
      p.idEstado ??
      (estadoObjeto ? (estadoObjeto.codigoExterno ?? estadoObjeto.codigoAlterno ?? null) : null);

    if (codigoAltEstado != null) {
      const estado = this.estadosPrestamo().find(
        (e) => e.codigoExterno === codigoAltEstado || e.codigoAlterno === codigoAltEstado,
      );
      if (estado?.nombre) return estado.nombre;
      if (nombreOriginal) return nombreOriginal;
      return `Estado ${codigoAltEstado}`;
    }

    return nombreOriginal || '-';
  }

  formatearFecha(p: Prestamo): string {
    return this.funcionesDatos.formatoFecha(p.fecha, FuncionesDatosService.SOLO_FECHA) || '';
  }

  // ================= exportar CSV =================

  exportarCSV(): void {
    const data = this.prestamosTabActivo();
    if (!data.length) {
      this.snackBar.open('No hay préstamos para exportar en este tipo de seguro.', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = [
      'Código',
      'N° Préstamo',
      'Entidad',
      'Estado Partícipe',
      'Producto',
      'Fecha',
      'Estado Préstamo',
      'Monto',
      'Total Pagado',
      'Saldo Total',
    ];

    const rows = data.map((p) => ({
      Código: p.codigo,
      'N° Préstamo': p.idAsoprep,
      Entidad: p.entidad?.razonSocial || p.entidad?.nombreComercial || '',
      'Estado Partícipe': this.obtenerEstadoParticipe(p),
      Producto: p.producto?.nombre || '',
      Fecha: this.formatearFecha(p),
      'Estado Préstamo': this.obtenerEstadoPrestamo(p),
      Monto: p.montoSolicitado || 0,
      'Total Pagado': p.totalPagado || 0,
      'Saldo Total': p.saldoTotal || 0,
    }));

    this.exportService.exportToCSV(rows, `prestamos-seguro-${this.activeTab().toLowerCase()}`, headers, headers);
  }

  // ================= asignación de seguro =================

  asignarSeguro(): void {
    const tipo = this.activeTab();
    const tipoLabel = this.tipoActivo().label;
    const cantidadPrestamos = this.prestamosTabActivo().length;
    const montoTotal = this.totalSaldoTabActivo();

    const dialogRef = this.dialog.open(AsignarSeguroDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true,
      data: { tipoSeguro: tipo, tipoLabel, cantidadPrestamos, montoTotal },
    });

    dialogRef.afterClosed().subscribe((result: AsignacionSeguro | undefined) => {
      if (!result) return;

      const mapa = { ...this.polizasAsignadas() };
      mapa[tipo] = result;
      this.polizasAsignadas.set(mapa);

      this.snackBar.open(
        `Seguro de ${tipoLabel} asignado correctamente (simulado) — ${cantidadPrestamos} préstamos cubiertos`,
        'Cerrar',
        { duration: 3500 },
      );

      // TODO(pendiente-backend): reemplazar este stub por la llamada real (incluyendo subida del
      // archivo adjunto) una vez el equipo de backend publique el endpoint de asignación de
      // seguros de préstamo.
      console.warn('[Asignación de Seguros] Asignación simulada — endpoint real pendiente del equipo de backend:', result);
    });
  }
}
