import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { map } from 'rxjs/operators';

import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleGeneracionArchivo } from '../../../../model/detalle-generacion-archivo';
import { GeneracionArchivoPetro } from '../../../../model/generacion-archivo-petro';
import { DetalleGeneracionArchivoService } from '../../../../service/detalle-generacion-archivo.service';
import { GeneracionArchivoPetroService } from '../../../../service/generacion-archivo-petro.service';

interface MesCirculo {
  numero: number;
  nombre: string;
  activo: boolean;
  tieneGeneracion: boolean;
}

@Component({
  selector: 'app-consulta-generacion-archivo',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './consulta-generacion-archivo.component.html',
  styleUrl: './consulta-generacion-archivo.component.scss',
})
export class ConsultaGeneracionArchivoComponent implements OnInit {
  registros: GeneracionArchivoPetro[] = [];
  registrosAnio: GeneracionArchivoPetro[] = [];
  registrosFiltrados: GeneracionArchivoPetro[] = [];

  aniosDisponibles: number[] = [];
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;

  meses: MesCirculo[] = [
    { numero: 1, nombre: 'ENE', activo: false, tieneGeneracion: false },
    { numero: 2, nombre: 'FEB', activo: false, tieneGeneracion: false },
    { numero: 3, nombre: 'MAR', activo: false, tieneGeneracion: false },
    { numero: 4, nombre: 'ABR', activo: false, tieneGeneracion: false },
    { numero: 5, nombre: 'MAY', activo: false, tieneGeneracion: false },
    { numero: 6, nombre: 'JUN', activo: false, tieneGeneracion: false },
    { numero: 7, nombre: 'JUL', activo: false, tieneGeneracion: false },
    { numero: 8, nombre: 'AGO', activo: false, tieneGeneracion: false },
    { numero: 9, nombre: 'SEP', activo: false, tieneGeneracion: false },
    { numero: 10, nombre: 'OCT', activo: false, tieneGeneracion: false },
    { numero: 11, nombre: 'NOV', activo: false, tieneGeneracion: false },
    { numero: 12, nombre: 'DIC', activo: false, tieneGeneracion: false },
  ];

  isLoading = signal<boolean>(false);

  constructor(
    private router: Router,
    private generacionArchivoPetroService: GeneracionArchivoPetroService,
    private detalleGeneracionArchivoService: DetalleGeneracionArchivoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarRegistros();
  }

  cargarRegistros(): void {
    this.isLoading.set(true);
    this.generacionArchivoPetroService.getAll().subscribe({
      next: (rows) => {
        const rowsArray = Array.isArray(rows) ? rows : rows ? [rows] : [];
        this.registros = this.normalizarRegistros(rowsArray);
        this.extraerAniosDisponibles();
        this.inicializarVista();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar consulta de generación', 'Cerrar', { duration: 4000 });
      },
    });
  }

  onAnioSeleccionado(): void {
    if (!this.anioSeleccionado) {
      this.resetearMeses();
      this.registrosAnio = [];
      this.registrosFiltrados = [];
      return;
    }

    const criterioAnio = new DatosBusqueda();
    criterioAnio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'anioPeriodo',
      String(this.anioSeleccionado),
      TipoComandosBusqueda.IGUAL,
    );

    const orderMes = new DatosBusqueda();
    orderMes.orderBy('mesPeriodo');
    orderMes.setTipoOrden(DatosBusqueda.ORDER_DESC);

    const orderCodigo = new DatosBusqueda();
    orderCodigo.orderBy('codigo');
    orderCodigo.setTipoOrden(DatosBusqueda.ORDER_DESC);

    this.generacionArchivoPetroService.selectByCriteria([criterioAnio, orderMes, orderCodigo]).subscribe({
      next: (rows) => {
        const rowsArray = this.extraerArray(rows);

        this.enriquecerRegistros(rowsArray).subscribe((registrosCompletos) => {
          this.registrosAnio = this.normalizarRegistros(registrosCompletos);

          this.resetearMeses();
          this.mesSeleccionado = null;

          this.registrosAnio
            .filter((item) => Number(item.anioPeriodo) === Number(this.anioSeleccionado))
            .forEach((item) => {
              const mes = this.meses.find((m) => m.numero === item.mesPeriodo);
              if (mes) {
                mes.tieneGeneracion = true;
              }
            });

          this.registrosFiltrados = this.registrosAnio.filter(
            (item) => Number(item.anioPeriodo) === Number(this.anioSeleccionado),
          );
          this.ordenarRegistros(this.registrosFiltrados);
        });
      },
      error: () => {
        this.resetearMeses();
        this.registrosAnio = [];
        this.registrosFiltrados = [];
      },
    });
  }

  onMesClick(mes: MesCirculo): void {
    if (!mes.tieneGeneracion || !this.anioSeleccionado) {
      return;
    }

    if (this.mesSeleccionado === mes.numero) {
      this.mesSeleccionado = null;
      this.meses.forEach((m) => (m.activo = false));
      this.registrosFiltrados = this.registrosAnio.filter(
        (item) => Number(item.anioPeriodo) === Number(this.anioSeleccionado),
      );
    } else {
      this.mesSeleccionado = mes.numero;
      this.meses.forEach((m) => (m.activo = false));
      mes.activo = true;
      this.registrosFiltrados = this.registrosAnio.filter(
        (item) => Number(item.anioPeriodo) === Number(this.anioSeleccionado) && item.mesPeriodo === mes.numero,
      );
    }

    this.ordenarRegistros(this.registrosFiltrados);
  }

  getMesNombre(numeroMes: number | undefined): string {
    if (!numeroMes) {
      return 'N/A';
    }

    const mes = this.meses.find((m) => m.numero === numeroMes);
    return mes?.nombre || 'N/A';
  }

  limpiarFiltros(): void {
    this.anioSeleccionado = null;
    this.mesSeleccionado = null;
    this.resetearMeses();
    this.registrosAnio = [];
    this.registrosFiltrados = [];
  }

  private extraerAniosDisponibles(): void {
    const aniosSet = new Set<number>();

    this.registros.forEach((item) => {
      if (item.anioPeriodo) {
        aniosSet.add(Number(item.anioPeriodo));
      }
    });
    this.aniosDisponibles = Array.from(aniosSet).sort((a, b) => b - a);
  }

  private normalizarRegistros(rows: GeneracionArchivoPetro[]): GeneracionArchivoPetro[] {
    return rows.map((item) => {
      let anio = this.aNumero(item.anioPeriodo);
      let mes = this.aNumero(item.mesPeriodo);

      if ((!anio || !mes) && Array.isArray(item.fechaGeneracion)) {
        const [year, month] = item.fechaGeneracion as unknown as number[];
        anio = anio || this.aNumero(year);
        mes = mes || this.aNumero(month);
      }

      if ((!anio || !mes) && typeof item.fechaGeneracion === 'string') {
        const fecha = new Date(item.fechaGeneracion);
        if (!Number.isNaN(fecha.getTime())) {
          anio = anio || fecha.getFullYear();
          mes = mes || fecha.getMonth() + 1;
        }
      }

      return {
        ...item,
        anioPeriodo: anio || item.anioPeriodo,
        mesPeriodo: mes || item.mesPeriodo,
      };
    });
  }

  private aNumero(valor: unknown): number {
    if (typeof valor === 'number') {
      return valor;
    }

    if (typeof valor === 'string') {
      const limpio = valor.trim();
      if (!limpio) return 0;
      const parsed = Number(limpio);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  private inicializarVista(): void {
    if (this.aniosDisponibles.length > 0) {
      this.anioSeleccionado = this.aniosDisponibles[0];
      this.onAnioSeleccionado();
    }
  }

  private resetearMeses(): void {
    this.meses.forEach((mes) => {
      mes.activo = false;
      mes.tieneGeneracion = false;
    });
  }

  private ordenarRegistros(rows: GeneracionArchivoPetro[]): void {
    rows.sort((a, b) => {
      if (a.anioPeriodo !== b.anioPeriodo) {
        return (b.anioPeriodo || 0) - (a.anioPeriodo || 0);
      }
      if (a.mesPeriodo !== b.mesPeriodo) {
        return (b.mesPeriodo || 0) - (a.mesPeriodo || 0);
      }
      return (b.codigo || 0) - (a.codigo || 0);
    });
  }

  verDetalle(item: GeneracionArchivoPetro): void {
    if (!item.codigo) return;
    this.router.navigate(['/menucreditos/archivos-petro/generar/detalle', item.codigo], {
      state: { generacion: item },
    });
  }

  private enriquecerRegistros(rows: GeneracionArchivoPetro[]) {
    if (!rows.length) {
      return of(rows);
    }

    const requests = rows.map((item) => {
      if (!item.codigo) {
        return of(item);
      }

      return this.generacionArchivoPetroService.getById(String(item.codigo)).pipe(
        switchMap((detalle) => {
          const registro = detalle || item;
          const codigoGeneracion = registro.codigo;
          const montoCabecera = Number(registro.totalMontoEnviado || 0);

          if (!codigoGeneracion || montoCabecera > 0) {
            return of(registro);
          }

          const criterioGeneracion = new DatosBusqueda();
          criterioGeneracion.asignaValorConCampoPadre(
            TipoDatosBusqueda.LONG,
            'generacionArchivoPetro',
            'codigo',
            String(codigoGeneracion),
            TipoComandosBusqueda.IGUAL,
          );

          return this.detalleGeneracionArchivoService.selectByCriteria([criterioGeneracion]).pipe(
            map((detalles: DetalleGeneracionArchivo[] | null) => {
              const montoDetalle = (detalles || []).reduce(
                (acc, d) => acc + Number(d.totalMonto || 0),
                0,
              );
              return {
                ...registro,
                totalMontoEnviado: montoDetalle,
              } as GeneracionArchivoPetro;
            }),
            catchError(() => of(registro)),
          );
        }),
        catchError(() => of(item)),
      );
    });

    return forkJoin(requests);
  }

  private extraerArray(rows: unknown): GeneracionArchivoPetro[] {
    if (Array.isArray(rows)) {
      return rows as GeneracionArchivoPetro[];
    }

    if (rows && typeof rows === 'object') {
      const payload = rows as Record<string, unknown>;
      if (Array.isArray(payload['data'])) {
        return payload['data'] as GeneracionArchivoPetro[];
      }
      return [rows as GeneracionArchivoPetro];
    }

    return [];
  }

  formatearMonto(monto: number | undefined): string {
    return `$ ${(monto || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
