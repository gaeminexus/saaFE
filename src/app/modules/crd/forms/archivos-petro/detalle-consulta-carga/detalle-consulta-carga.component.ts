import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { CargaArchivo } from '../../../model/carga-archivo';
import { DetalleCargaArchivo } from '../../../model/detalle-carga-archivo';
import { ParticipeXCargaArchivo } from '../../../model/participe-x-carga-archivo';
import { CargaArchivoService } from '../../../service/carga-archivo.service';
import { DetalleCargaArchivoService } from '../../../service/detalle-carga-archivo.service';
import { ParticipeXCargaArchivoService } from '../../../service/participe-x-carga-archivo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Filial } from '../../../model/filial';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { forkJoin, of } from 'rxjs';

interface Mes {
  valor: number;
  nombre: string;
}

interface AporteAgrupado {
  codigoAporte: string;
  nombreAporte: string;
  totalParticipes: number;
  totales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  };
  participes: ParticipeXCargaArchivo[];
}

@Component({
  selector: 'app-detalle-consulta-carga.component',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './detalle-consulta-carga.component.html',
  styleUrl: './detalle-consulta-carga.component.scss'
})
export class DetalleConsultaCargaComponent implements OnInit {

  // Datos de la carga
  cargaArchivo: CargaArchivo | null = null;
  detalles: DetalleCargaArchivo[] = [];
  aporteAgrupados: AporteAgrupado[] = [];

  // Datos de filtros (solo lectura)
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;
  filialSeleccionada: Filial | null = null;
  nombreArchivo: string = '';

  // Combos (solo display)
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
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Totales generales
  totalRegistros: number = 0;
  totalesGenerales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  } = {
    saldoActual: 0,
    interesAnual: 0,
    valorSeguro: 0,
    totalDescontar: 0,
    capitalDescontado: 0,
    interesDescontado: 0,
    seguroDescontado: 0,
    totalDescontado: 0,
    capitalNoDescontado: 0,
    interesNoDescontado: 0,
    desgravamenNoDescontado: 0
  };

  displayedColumns: string[] = [
    'codigo', 'nombre', 'plazoInicial', 'saldoActual', 'mesesPlazo',
    'interesAnual', 'valorSeguro', 'totalDescontar', 'capitalDescontado',
    'interesDescontado', 'seguroDescontado', 'totalDescontado',
    'capitalNoDescontado', 'interesNoDescontado', 'desgravamenNoDescontado'
  ];

  // Loading state
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cargaArchivoService: CargaArchivoService,
    private detalleCargaArchivoService: DetalleCargaArchivoService,
    private participeXCargaArchivoService: ParticipeXCargaArchivoService,
    private snackBar: MatSnackBar
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    // Obtener el ID de la carga desde los parámetros de la ruta
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDatos(parseInt(id, 10));
    } else {
      this.snackBar.open('No se proporcionó ID de carga', 'Cerrar', { duration: 3000 });
      this.volverAtras();
    }
  }

  /**
   * Carga todos los datos de la carga de archivo
   */
  private cargarDatos(idCarga: number): void {
    this.isLoading = true;

    // Primero obtener la carga archivo principal
    this.cargaArchivoService.getById(idCarga.toString()).subscribe({
      next: (carga: any) => {
        if (!carga) {
          this.snackBar.open('No se encontró la carga de archivo', 'Cerrar', { duration: 3000 });
          this.volverAtras();
          return;
        }

        this.cargaArchivo = carga;
        this.anioSeleccionado = carga.anioAfectacion;
        this.mesSeleccionado = carga.mesAfectacion;
        this.filialSeleccionada = carga.filial;
        this.nombreArchivo = carga.nombre;

        // Copiar totales desde la carga
        this.totalesGenerales = {
          saldoActual: carga.totalSaldoActual || 0,
          interesAnual: carga.totalInteresAnual || 0,
          valorSeguro: carga.totalValorSeguro || 0,
          totalDescontar: carga.totalDescontar || 0,
          capitalDescontado: carga.totalCapitalDescontado || 0,
          interesDescontado: carga.totalInteresDescontado || 0,
          seguroDescontado: carga.totalSeguroDescontado || 0,
          totalDescontado: carga.totalDescontado || 0,
          capitalNoDescontado: carga.totalCapitalNoDescontado || 0,
          interesNoDescontado: carga.totalInteresNoDescontado || 0,
          desgravamenNoDescontado: carga.totalDesgravamenNoDescontado || 0
        };

        // Cargar detalles
        this.cargarDetalles(idCarga);
      },
      error: (error) => {
        console.error('Error al cargar carga archivo:', error);
        this.isLoading = false;
        this.snackBar.open('Error al cargar datos de la carga', 'Cerrar', { duration: 3000 });
        this.volverAtras();
      }
    });
  }

  /**
   * Carga los detalles de la carga archivo
   */
  private cargarDetalles(idCarga: number): void {
    const criterioArray: DatosBusqueda[] = [];
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cargaArchivo',
      'codigo',
      idCarga.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioArray.push(criterio);

    this.detalleCargaArchivoService.selectByCriteria(criterioArray).subscribe({
      next: (detalles: any) => {
        if (!detalles || (Array.isArray(detalles) && detalles.length === 0)) {
          this.isLoading = false;
          this.snackBar.open('No se encontraron detalles para esta carga', 'Cerrar', { duration: 3000 });
          return;
        }

        this.detalles = Array.isArray(detalles) ? detalles : [detalles];

        // Cargar partícipes para cada detalle
        this.cargarParticipes();
      },
      error: (error) => {
        console.error('Error al cargar detalles:', error);
        this.isLoading = false;
        this.snackBar.open('Error al cargar detalles de la carga', 'Cerrar', { duration: 3000 });
      }
    });
  }

  /**
   * Carga los partícipes para todos los detalles
   */
  private cargarParticipes(): void {
    if (this.detalles.length === 0) {
      this.isLoading = false;
      return;
    }

    // Crear un observable por cada detalle para buscar sus partícipes
    const observables = this.detalles.map(detalle => {
      const criterioArray: DatosBusqueda[] = [];
      const criterio = new DatosBusqueda();

      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'detalleCargaArchivo',
        'codigo',
        detalle.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioArray.push(criterio);

      return this.participeXCargaArchivoService.selectByCriteria(criterioArray);
    });

    // Ejecutar todas las búsquedas en paralelo
    forkJoin(observables).subscribe({
      next: (resultados: any[]) => {
        this.isLoading = false;

        // Combinar todos los resultados en un solo array
        const todosLosParticipes: ParticipeXCargaArchivo[] = [];

        resultados.forEach(participes => {
          if (participes) {
            const participesArray = Array.isArray(participes) ? participes : [participes];
            todosLosParticipes.push(...participesArray);
          }
        });

        if (todosLosParticipes.length === 0) {
          this.snackBar.open('No se encontraron partícipes para esta carga', 'Cerrar', { duration: 3000 });
          return;
        }

        // Agrupar partícipes por detalle (producto/aporte)
        this.agruparDatosPorAporte(todosLosParticipes);
      },
      error: (error) => {
        console.error('Error al cargar partícipes:', error);
        this.isLoading = false;
        this.snackBar.open('Error al cargar partícipes', 'Cerrar', { duration: 3000 });
      }
    });
  }

  /**
   * Agrupa los partícipes por aporte/producto
   */
  private agruparDatosPorAporte(participes: ParticipeXCargaArchivo[]): void {
    const aportesMap = new Map<string, AporteAgrupado>();

    participes.forEach(participe => {
      const detalle = participe.detalleCargaArchivo;
      const codigoAporte = detalle.codigoPetroProducto;

      if (!aportesMap.has(codigoAporte)) {
        // Crear nuevo grupo de aporte
        aportesMap.set(codigoAporte, {
          codigoAporte: codigoAporte,
          nombreAporte: detalle.nombreProductoPetro,
          totalParticipes: 0,
          totales: {
            saldoActual: 0,
            interesAnual: 0,
            valorSeguro: 0,
            totalDescontar: 0,
            capitalDescontado: 0,
            interesDescontado: 0,
            seguroDescontado: 0,
            totalDescontado: 0,
            capitalNoDescontado: 0,
            interesNoDescontado: 0,
            desgravamenNoDescontado: 0
          },
          participes: []
        });
      }

      const aporte = aportesMap.get(codigoAporte)!;
      aporte.participes.push(participe);
      aporte.totalParticipes++;

      // Acumular totales
      aporte.totales.saldoActual += participe.saldoActual || 0;
      aporte.totales.interesAnual += participe.interesAnual || 0;
      aporte.totales.valorSeguro += participe.valorSeguro || 0;
      aporte.totales.totalDescontar += participe.montoDescontar || 0;
      aporte.totales.capitalDescontado += participe.capitalDescontado || 0;
      aporte.totales.interesDescontado += participe.interesDescontado || 0;
      aporte.totales.seguroDescontado += participe.seguroDescontado || 0;
      aporte.totales.totalDescontado += participe.totalDescontado || 0;
      aporte.totales.capitalNoDescontado += participe.capitalNoDescontado || 0;
      aporte.totales.interesNoDescontado += participe.interesNoDescontado || 0;
      aporte.totales.desgravamenNoDescontado += participe.desgravamenNoDescontado || 0;
    });

    this.aporteAgrupados = Array.from(aportesMap.values());
    this.totalRegistros = participes.length;
  }

  /**
   * Obtiene el nombre de la filial
   */
  getFilialNombre(): string {
    return this.filialSeleccionada?.nombre || 'N/A';
  }

  /**
   * Descarga el archivo desde el servidor
   */
  descargarArchivo(): void {
    if (!this.cargaArchivo || !this.cargaArchivo.rutaArchivo) {
      this.snackBar.open('No hay archivo disponible para descargar', 'Cerrar', { duration: 3000 });
      return;
    }

    // Aquí implementarías la lógica para descargar el archivo
    // Por ahora mostramos un mensaje
    this.snackBar.open('Funcionalidad de descarga en construcción', 'Cerrar', { duration: 3000 });

    // TODO: Implementar descarga real del archivo
    // window.open(rutaDescarga, '_blank');
  }

  /**
   * Vuelve a la pantalla anterior
   */
  volverAtras(): void {
    this.router.navigate(['/menucreditos/consulta-archivos-petro']);
  }
}

