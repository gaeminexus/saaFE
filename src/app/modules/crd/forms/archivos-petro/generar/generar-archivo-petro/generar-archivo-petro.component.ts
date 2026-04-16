import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Filial } from '../../../../model/filial';
import { DetalleGeneracionArchivo } from '../../../../model/detalle-generacion-archivo';
import { ParticipeGeneracionArchivo } from '../../../../model/participe-generacion-archivo';
import { FilialService } from '../../../../service/filial.service';
import { GeneracionArchivoPetroService } from '../../../../service/generacion-archivo-petro.service';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { ParticipeGeneracionArchivoService } from '../../../../service/participe-generacion-archivo.service';

interface Mes {
  valor: number;
  nombre: string;
}

@Component({
  selector: 'app-generar-archivo-petro',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './generar-archivo-petro.component.html',
  styleUrl: './generar-archivo-petro.component.scss',
})
export class GenerarArchivoPetroComponent implements OnInit {
  filiales: Filial[] = [];
  anios: number[] = [];
  meses: Mes[] = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' },
  ];

  filialSeleccionada: number | null = null;
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;

  previewRegistros: ParticipeGeneracionArchivo[] = [];
  resumenProductos: DetalleGeneracionArchivo[] = [];

  isLoadingPreview = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  isLoadingFiliales = signal<boolean>(false);
  isLoadingMeses = signal<boolean>(false);
  mesesGenerados: number[] = [];

  displayedColumns: string[] = ['rolPetrocomercial', 'codigoProductoPetro', 'montoEnviado', 'estado'];

  constructor(
    private router: Router,
    private filialService: FilialService,
    private generacionArchivoPetroService: GeneracionArchivoPetroService,
    private participeGeneracionArchivoService: ParticipeGeneracionArchivoService,
    private snackBar: MatSnackBar,
  ) {
    const anioActual = new Date().getFullYear();
    for (let anio = anioActual - 2; anio <= anioActual + 5; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    this.cargarFiliales();
  }

  onFilialChange(): void {
    this.mesSeleccionado = null;
    this.mesesGenerados = [];
    if (this.filialSeleccionada && this.anioSeleccionado) {
      this.buscarMesesGenerados();
    }
    this.previewRegistros = [];
    this.resumenProductos = [];
  }

  onAnioChange(): void {
    this.mesSeleccionado = null;
    this.mesesGenerados = [];
    if (this.filialSeleccionada && this.anioSeleccionado) {
      this.buscarMesesGenerados();
    }
    this.previewRegistros = [];
    this.resumenProductos = [];
  }

  buscarMesesGenerados(): void {
    const filial = this.filialSeleccionada;
    const anio = this.anioSeleccionado;
    if (!filial || !anio) return;

    this.isLoadingMeses.set(true);

    const criterios: DatosBusqueda[] = [];

    const dbFilial = new DatosBusqueda();
    dbFilial.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'filial',
      'codigo',
      filial.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbFilial);

    const dbAnio = new DatosBusqueda();
    dbAnio.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'anioPeriodo',
      anio.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbAnio);

    this.generacionArchivoPetroService.selectByCriteria(criterios).subscribe({
      next: (registros) => {
        if (registros && Array.isArray(registros)) {
          this.mesesGenerados = registros
            .map(r => r.mesPeriodo)
            .filter((mes): mes is number => mes !== undefined && mes !== null);
        } else {
          this.mesesGenerados = [];
        }
        this.isLoadingMeses.set(false);
      },
      error: () => {
        this.mesesGenerados = [];
        this.isLoadingMeses.set(false);
      }
    });
  }

  isMesGenerado(mesValor: number): boolean {
    return this.mesesGenerados.includes(mesValor);
  }

  cargarFiliales(): void {
    this.isLoadingFiliales.set(true);
    this.filialService.getAll().subscribe({
      next: (filiales) => {
        this.filiales = filiales || [];
        this.isLoadingFiliales.set(false);
      },
      error: () => {
        this.isLoadingFiliales.set(false);
        this.snackBar.open('Error al cargar filiales', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cargarPreview(): void {
    if (!this.filialSeleccionada || !this.anioSeleccionado || !this.mesSeleccionado) {
      this.snackBar.open('Seleccione filial, año y mes para cargar preview', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.isLoadingPreview.set(true);
    this.previewRegistros = [];
    this.resumenProductos = [];

    this.participeGeneracionArchivoService
      .previewByPeriodo(this.anioSeleccionado, this.mesSeleccionado, this.filialSeleccionada)
      .subscribe({
        next: (rows) => {
          this.previewRegistros = rows || [];
          this.resumenProductos = this.agruparPreviewPorProducto(this.previewRegistros);
          this.isLoadingPreview.set(false);
        },
        error: () => {
          this.isLoadingPreview.set(false);
          this.snackBar.open('No fue posible obtener el preview', 'Cerrar', { duration: 4000 });
        },
      });
  }

  generarArchivo(): void {
    if (!this.filialSeleccionada || !this.anioSeleccionado || !this.mesSeleccionado) {
      this.snackBar.open('Complete los filtros antes de generar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isGenerating.set(true);

    const payloadCabecera = {
      anioPeriodo: this.anioSeleccionado,
      mesPeriodo: this.mesSeleccionado,
      filial: { codigo: this.filialSeleccionada },
      usuarioGeneracion: this.obtenerUsuarioGeneracion(),
    };

    console.log('[GenerarArchivoPetro] Payload cabecera:', payloadCabecera);

    this.generacionArchivoPetroService.add(payloadCabecera).subscribe({
      next: (cabecera) => {
        console.log('[GenerarArchivoPetro] Respuesta add cabecera:', cabecera);
        const codigoGeneracion = this.extraerCodigoGeneracion(cabecera);
        console.log('[GenerarArchivoPetro] Código generación extraído:', codigoGeneracion);
        if (!codigoGeneracion) {
          this.isGenerating.set(false);
          this.snackBar.open('No fue posible crear la cabecera de generación', 'Cerrar', { duration: 4000 });
          return;
        }

        const parametrosGeneracion = {
          anioPeriodo: String(this.anioSeleccionado),
          mesPeriodo: String(this.mesSeleccionado),
          codigoFilial: String(this.filialSeleccionada),
        };

        console.log('[GenerarArchivoPetro] Invocando generarArchivo con ID:', codigoGeneracion);
        console.log('[GenerarArchivoPetro] Parámetros generarArchivo:', parametrosGeneracion);

        this.generacionArchivoPetroService
          .generarArchivo(codigoGeneracion, parametrosGeneracion)
          .subscribe({
          next: (respuestaGeneracion) => {
            console.log('[GenerarArchivoPetro] Respuesta generarArchivo:', respuestaGeneracion);
            this.isGenerating.set(false);
            this.snackBar.open('Archivo generado exitosamente', 'Cerrar', { duration: 4000 });
            this.router.navigate(['/menucreditos/archivos-petro/generar/detalle', codigoGeneracion]);
          },
          error: (errorGeneracion) => {
            console.error('[GenerarArchivoPetro] Error generarArchivo:', errorGeneracion);
            this.isGenerating.set(false);
            this.snackBar.open('Error al generar detalle de archivo', 'Cerrar', { duration: 4000 });
          },
        });
      },
      error: (errorCabecera) => {
        console.error('[GenerarArchivoPetro] Error add cabecera:', errorCabecera);
        this.isGenerating.set(false);
        this.snackBar.open('Error al crear cabecera de generación', 'Cerrar', { duration: 4000 });
      },
    });
  }

  get totalRegistrosPreview(): number {
    return this.previewRegistros.length;
  }

  get totalMontoPreview(): number {
    return this.previewRegistros.reduce((acc, item) => acc + (item.montoEnviado || 0), 0);
  }

  formatearMonto(monto: number | undefined): string {
    return `$ ${(monto || 0).toFixed(2)}`;
  }

  private agruparPreviewPorProducto(rows: ParticipeGeneracionArchivo[]): DetalleGeneracionArchivo[] {
    const grouped = new Map<string, DetalleGeneracionArchivo>();

    rows.forEach((row) => {
      const key = row.codigoProductoPetro || 'NA';
      if (!grouped.has(key)) {
        grouped.set(key, {
          codigoProductoPetro: key,
          descripcionProducto: `Producto ${key}`,
          totalRegistros: 0,
          totalMonto: 0,
        });
      }

      const current = grouped.get(key)!;
      current.totalRegistros = (current.totalRegistros || 0) + 1;
      current.totalMonto = (current.totalMonto || 0) + (row.montoEnviado || 0);
    });

    return Array.from(grouped.values()).sort((a, b) => a.codigoProductoPetro.localeCompare(b.codigoProductoPetro));
  }

  private obtenerUsuarioGeneracion(): string {
    return (localStorage.getItem('userName') || localStorage.getItem('usuario') || 'sistema').trim();
  }

  private extraerCodigoGeneracion(cabecera: unknown): number | null {
    if (typeof cabecera === 'number') {
      return cabecera;
    }

    if (typeof cabecera === 'string') {
      const codigo = Number(cabecera);
      return Number.isNaN(codigo) ? null : codigo;
    }

    if (cabecera && typeof cabecera === 'object') {
      const payload = cabecera as Record<string, unknown>;
      const codigo = payload['codigo'] ?? payload['id'] ?? payload['codigoGeneracion'];

      if (typeof codigo === 'number') {
        return codigo;
      }

      if (typeof codigo === 'string') {
        const parsed = Number(codigo);
        return Number.isNaN(parsed) ? null : parsed;
      }
    }

    return null;
  }
}
