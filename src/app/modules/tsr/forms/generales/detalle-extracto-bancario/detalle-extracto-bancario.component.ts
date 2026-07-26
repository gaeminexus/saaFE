import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleExtractoBancario, EstadoRevisionExtracto } from '../../../model/detalle-extracto-bancario';
import { EstadoCargaExtracto, ExtractoBancario } from '../../../model/extracto-bancario';
import { DetalleExtractoBancarioService } from '../../../service/detalle-extracto-bancario.service';
import { ExtractoBancarioService } from '../../../service/extracto-bancario.service';

@Component({
  selector: 'app-detalle-extracto-bancario',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './detalle-extracto-bancario.component.html',
  styleUrl: './detalle-extracto-bancario.component.scss',
})
export class DetalleExtractoBancarioComponent implements OnInit {
  idExtracto: number | null = null;
  extracto: ExtractoBancario | null = null;
  detalles: DetalleExtractoBancario[] = [];

  filaExpandida: number | null = null;

  isLoadingExtracto: boolean = false;
  isLoadingDetalles: boolean = false;

  displayedColumns: string[] = [
    'fechaTransaccion',
    'descripcion',
    'referencia',
    'debito',
    'credito',
    'saldo',
    'estadoRevision',
    'acciones',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private extractoBancarioService: ExtractoBancarioService,
    private detalleExtractoBancarioService: DetalleExtractoBancarioService,
    private funcionesDatosService: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = Number(params['idExtracto']);
      if (id) {
        this.idExtracto = id;
        this.cargarExtracto(id);
        this.cargarDetalles(id);
      }
    });
  }

  cargarExtracto(id: number): void {
    this.isLoadingExtracto = true;
    this.extractoBancarioService.getById(id).subscribe({
      next: (extracto) => {
        this.extracto = extracto;
        this.isLoadingExtracto = false;
      },
      error: () => {
        this.isLoadingExtracto = false;
      },
    });
  }

  cargarDetalles(idExtracto: number): void {
    this.isLoadingDetalles = true;
    const criterios: DatosBusqueda[] = [];
    const dbExtracto = new DatosBusqueda();
    dbExtracto.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'extractoBancario',
      'codigo',
      idExtracto.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbExtracto);

    this.detalleExtractoBancarioService.selectByCriteria(criterios).subscribe({
      next: (detalles) => {
        this.detalles = Array.isArray(detalles) ? [...detalles].sort((a, b) => a.numeroFila - b.numeroFila) : [];
        this.isLoadingDetalles = false;
      },
      error: () => {
        this.detalles = [];
        this.isLoadingDetalles = false;
      },
    });
  }

  toggleFilaCruda(detalle: DetalleExtractoBancario): void {
    this.filaExpandida = this.filaExpandida === detalle.codigo ? null : detalle.codigo;
  }

  formatearSoloFecha(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  formatearFechaHora(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }

  obtenerEstadoCargaTexto(estadoCarga: number | undefined): string {
    switch (estadoCarga) {
      case EstadoCargaExtracto.CARGADO:
        return 'Cargado';
      case EstadoCargaExtracto.VALIDADO:
        return 'Validado';
      case EstadoCargaExtracto.APLICADO:
        return 'Aplicado';
      case EstadoCargaExtracto.ERROR:
        return 'Error';
      default:
        return 'N/A';
    }
  }

  obtenerEstadoRevisionInfo(estadoRevision: number): { texto: string; clase: string } {
    switch (estadoRevision) {
      case EstadoRevisionExtracto.CONCILIADA:
        return { texto: 'Conciliada', clase: 'estado-conciliada' };
      case EstadoRevisionExtracto.DESCARTADA:
        return { texto: 'Descartada', clase: 'estado-descartada' };
      default:
        return { texto: 'Pendiente', clase: 'estado-pendiente' };
    }
  }

  regresar(): void {
    this.router.navigate(['/menutesoreria/procesos/extractos-bancarios/consulta']);
  }
}
