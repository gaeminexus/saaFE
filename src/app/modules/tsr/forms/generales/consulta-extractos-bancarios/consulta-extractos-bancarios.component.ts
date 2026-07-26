import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { EstadoCargaExtracto, ExtractoBancario } from '../../../model/extracto-bancario';
import { ExtractoBancarioService } from '../../../service/extracto-bancario.service';

@Component({
  selector: 'app-consulta-extractos-bancarios',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './consulta-extractos-bancarios.component.html',
  styleUrl: './consulta-extractos-bancarios.component.scss',
})
export class ConsultaExtractosBancariosComponent implements OnInit {
  extractos: ExtractoBancario[] = [];
  extractosFiltrados: ExtractoBancario[] = [];
  filtroTexto: string = '';

  isLoading: boolean = false;

  displayedColumns: string[] = [
    'banco',
    'cuenta',
    'periodo',
    'saldoInicial',
    'saldoFinal',
    'estadoCarga',
    'archivoNombre',
    'usuarioCreacion',
    'fechaCreacion',
    'acciones',
  ];

  constructor(
    private extractoBancarioService: ExtractoBancarioService,
    private router: Router,
    private funcionesDatosService: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.cargarExtractos();
  }

  cargarExtractos(): void {
    this.isLoading = true;
    this.extractoBancarioService.getAll().subscribe({
      next: (data) => {
        this.extractos = Array.isArray(data) ? data : [];
        this.aplicarFiltro();
        this.isLoading = false;
      },
      error: () => {
        this.extractos = [];
        this.extractosFiltrados = [];
        this.isLoading = false;
      },
    });
  }

  aplicarFiltro(): void {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      this.extractosFiltrados = [...this.extractos];
      return;
    }
    this.extractosFiltrados = this.extractos.filter((e) => {
      const base = `${e.cuentaBancaria?.banco?.nombre ?? ''} ${e.cuentaBancaria?.numeroCuenta ?? ''} ${
        e.archivoNombre ?? ''
      } ${e.usuarioCreacion ?? ''}`.toLowerCase();
      return base.includes(texto);
    });
  }

  verDetalle(extracto: ExtractoBancario): void {
    this.router.navigate(['/menutesoreria/procesos/extractos-bancarios/detalle'], {
      queryParams: { idExtracto: extracto.codigo },
    });
  }

  formatearSoloFecha(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  formatearFechaHora(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }

  obtenerEstadoInfo(estadoCarga: number): { texto: string; clase: string } {
    switch (estadoCarga) {
      case EstadoCargaExtracto.CARGADO:
        return { texto: 'Cargado', clase: 'estado-cargado' };
      case EstadoCargaExtracto.VALIDADO:
        return { texto: 'Validado', clase: 'estado-validado' };
      case EstadoCargaExtracto.APLICADO:
        return { texto: 'Aplicado', clase: 'estado-aplicado' };
      case EstadoCargaExtracto.ERROR:
        return { texto: 'Error', clase: 'estado-error' };
      default:
        return { texto: 'N/A', clase: 'estado-desconocido' };
    }
  }
}
