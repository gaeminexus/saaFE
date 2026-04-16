import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { GeneracionArchivoPetro } from '../../../../model/generacion-archivo-petro';
import { DetalleGeneracionArchivo } from '../../../../model/detalle-generacion-archivo';
import { ParticipeGeneracionArchivo } from '../../../../model/participe-generacion-archivo';
import { GeneracionArchivoPetroService } from '../../../../service/generacion-archivo-petro.service';
import { DetalleGeneracionArchivoService } from '../../../../service/detalle-generacion-archivo.service';
import { ParticipeGeneracionArchivoService } from '../../../../service/participe-generacion-archivo.service';
import { FileService } from '../../../../../../shared/services/file.service';
import { ExportService } from '../../../../../../shared/services/export.service';
import { CuotaXParticipeGeneracionService } from '../../../../service/cuota-x-participe-generacion.service';
import { CuotaXParticipeGeneracion } from '../../../../model/cuota-x-participe-generacion';

interface ProductoAgrupado {
  codigoProductoPetro: string;
  descripcionProducto?: string;
  totalRegistros: number;
  totalMonto: number;
  participes: ParticipeGeneracionArchivo[];
  expandido: boolean;
  cargandoParticipes: boolean;
  codigoDetalle: number;
}

@Component({
  selector: 'app-detalle-generacion-archivo',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './detalle-generacion-archivo.component.html',
  styleUrl: './detalle-generacion-archivo.component.scss',
})
export class DetalleGeneracionArchivoComponent implements OnInit {
  generacion: GeneracionArchivoPetro | null = null;
  productosAgrupados: ProductoAgrupado[] = [];
  isLoading = signal<boolean>(false);

  nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  displayedColumnsParticipe: string[] = [
    'cedula', 'nombre', 'codigoProducto', 'montoEnviado', 'estado', 'acciones',
  ];

  expandedParticipe: ParticipeGeneracionArchivo | null = null;
  cuotasMap = new Map<number, CuotaXParticipeGeneracion[]>();
  cargandoCuotasSet = new Set<number>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private generacionService: GeneracionArchivoPetroService,
    private detalleService: DetalleGeneracionArchivoService,
    private participeService: ParticipeGeneracionArchivoService,
    private fileService: FileService,
    private exportService: ExportService,
    private cuotaService: CuotaXParticipeGeneracionService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const stateGeneracion = history.state?.generacion as GeneracionArchivoPetro | undefined;

    if (id) {
      if (stateGeneracion?.codigo && String(stateGeneracion.codigo) === id) {
        this.generacion = stateGeneracion;
      }
      this.cargarDatos(id);
    } else {
      this.volverAtras();
    }
  }

  cargarDatos(id: string): void {
    this.isLoading.set(true);
    this.generacionService.getById(id).subscribe({
      next: (gen) => {
        this.generacion = gen;
        if (gen?.codigo) {
          this.cargarDetalles(gen.codigo);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar la generación', 'Cerrar', { duration: 4000 });
      },
    });
  }

  private cargarDetalles(codigoGeneracion: number): void {
    const criterioGeneracion = new DatosBusqueda();
    criterioGeneracion.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'generacionArchivoPetro',
      'codigo',
      String(codigoGeneracion),
      TipoComandosBusqueda.IGUAL,
    );

    const orderProducto = new DatosBusqueda();
    orderProducto.orderBy('codigoProductoPetro');
    orderProducto.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.detalleService.selectByCriteria([criterioGeneracion, orderProducto]).subscribe({
      next: (detalles) => {
        this.productosAgrupados = (detalles || []).map((d: DetalleGeneracionArchivo) => ({
          codigoProductoPetro: d.codigoProductoPetro,
          descripcionProducto: d.descripcionProducto,
          totalRegistros: d.totalRegistros || 0,
          totalMonto: d.totalMonto || 0,
          participes: [],
          expandido: false,
          cargandoParticipes: false,
          codigoDetalle: d.codigo || 0,
        }));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar los detalles por producto', 'Cerrar', { duration: 4000 });
      },
    });
  }

  onProductoOpened(producto: ProductoAgrupado): void {
    producto.expandido = true;
    if (producto.participes.length === 0 && !producto.cargandoParticipes) {
      this.cargarParticipes(producto);
    }
  }

  onProductoClosed(producto: ProductoAgrupado): void {
    producto.expandido = false;
  }

  private cargarParticipes(producto: ProductoAgrupado): void {
    if (!producto.codigoDetalle) return;
    producto.cargandoParticipes = true;

    const criterioDetalle = new DatosBusqueda();
    criterioDetalle.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'detalleGeneracionArchivo',
      'codigo',
      String(producto.codigoDetalle),
      TipoComandosBusqueda.IGUAL,
    );

    const orderLinea = new DatosBusqueda();
    orderLinea.orderBy('numeroLinea');
    orderLinea.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.participeService.selectByCriteria([criterioDetalle, orderLinea]).subscribe({
      next: (rows) => {
        producto.participes = rows || [];
        producto.cargandoParticipes = false;
      },
      error: () => {
        producto.cargandoParticipes = false;
        this.snackBar.open('Error al cargar partícipes del producto', 'Cerrar', { duration: 4000 });
      },
    });
  }

  getMesNombre(mes: number | undefined): string {
    if (!mes) return 'N/A';
    return this.nombresMeses[mes - 1] || 'N/A';
  }

  getEstadoLabel(estado: number | undefined): string {
    const estados: Record<number, string> = {
      1: 'Pendiente',
      2: 'Procesado',
      3: 'Enviado',
      4: 'Error',
    };
    return estados[estado || 0] || 'N/A';
  }

  getEstadoClass(estado: number | undefined): string {
    const clases: Record<number, string> = {
      1: 'estado-pendiente',
      2: 'estado-procesado',
      3: 'estado-enviado',
      4: 'estado-error',
    };
    return clases[estado || 0] || '';
  }

  formatearMonto(monto: number | undefined): string {
    return `$ ${(monto || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatearFechaGeneracion(fecha: unknown): string {
    if (!fecha) {
      return 'N/A';
    }

    if (Array.isArray(fecha)) {
      const anio = Number(fecha[0]);
      const mes = Number(fecha[1]);
      const dia = Number(fecha[2]);
      const hora = Number(fecha[3] || 0);
      const minuto = Number(fecha[4] || 0);
      const segundo = Number(fecha[5] || 0);

      if (!anio || !mes || !dia) {
        return String(fecha);
      }

      const fechaDate = new Date(anio, mes - 1, dia, hora, minuto, segundo);
      if (Number.isNaN(fechaDate.getTime())) {
        return String(fecha);
      }

      if (fecha.length >= 4) {
        return fechaDate.toLocaleString('es-EC', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      return fechaDate.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    if (typeof fecha === 'string') {
      const parsed = new Date(fecha);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString('es-EC', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return fecha;
    }

    return String(fecha);
  }

  descargarArchivoGenerado(): void {
    const filePath = (this.generacion?.rutaArchivo || '').trim();

    if (!filePath) {
      this.snackBar.open('No existe ruta de archivo para descargar', 'Cerrar', { duration: 4000 });
      return;
    }

    const saveFileName = this.getNombreArchivoMostrado();
    this.fileService.downloadAndSaveFile(filePath, saveFileName);
    this.snackBar.open('Descargando archivo...', 'Cerrar', { duration: 2500 });
  }

  puedeDescargarArchivo(): boolean {
    return !!this.generacion?.rutaArchivo;
  }

  getNombreArchivoMostrado(): string {
    const nombre = (this.generacion?.nombreArchivo || '').trim();
    if (nombre) {
      return nombre;
    }

    const ruta = (this.generacion?.rutaArchivo || '').trim();
    if (!ruta) {
      return 'N/A';
    }

    const partes = ruta.split(/[\\/]/);
    return partes[partes.length - 1] || ruta;
  }

  exportarTodosLosParticipes(): void {
    if (this.productosAgrupados.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const todosLosParticipes = this.productosAgrupados.flatMap((prod) => prod.participes);

    if (todosLosParticipes.length === 0) {
      this.snackBar.open('No hay partícipes para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const filas = todosLosParticipes.map((p) => ({
      'Cédula': p.entidad?.numeroIdentificacion || '',
      'Nombre': p.entidad?.razonSocial || '',
      'Producto': p.codigoProductoPetro || '',
      'Monto Enviado': this.formatearMonto(p.montoEnviado),
      'Estado': this.getEstadoLabel(p.estado),
    }));

    const nombreArchivo = `Participes_${this.generacion?.mesPeriodo || 'XX'}_${this.generacion?.anioPeriodo || 'XXXX'}.csv`;
    this.exportService.exportToCSV(filas, nombreArchivo, ['Cédula', 'Nombre', 'Producto', 'Monto Enviado', 'Estado']);
    this.snackBar.open('Exportación iniciada', 'Cerrar', { duration: 2000 });
  }

  exportarParticipesProducto(producto: ProductoAgrupado): void {
    if (producto.participes.length === 0) {
      this.snackBar.open('No hay partícipes para este producto', 'Cerrar', { duration: 3000 });
      return;
    }

    const filas = producto.participes.map((p) => ({
      'Cédula': p.entidad?.numeroIdentificacion || '',
      'Nombre': p.entidad?.razonSocial || '',
      'Producto': p.codigoProductoPetro || '',
      'Monto Enviado': this.formatearMonto(p.montoEnviado),
      'Estado': this.getEstadoLabel(p.estado),
    }));

    const nombreArchivo = `Participes_${producto.codigoProductoPetro}_${this.generacion?.mesPeriodo || 'XX'}_${this.generacion?.anioPeriodo || 'XXXX'}.csv`;
    this.exportService.exportToCSV(filas, nombreArchivo, ['Cédula', 'Nombre', 'Producto', 'Monto Enviado', 'Estado']);
    this.snackBar.open('Exportación iniciada', 'Cerrar', { duration: 2000 });
  }

  toggleDetalle(participe: ParticipeGeneracionArchivo): void {
    if (this.expandedParticipe === participe) {
      this.expandedParticipe = null;
      return;
    }

    this.expandedParticipe = participe;

    const id = participe.codigo;
    if (!id || this.cuotasMap.has(id)) return;

    this.cargandoCuotasSet.add(id);

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'participeDetalleGeneracion',
      'codigo',
      String(id),
      TipoComandosBusqueda.IGUAL,
    );

    const orderCuota = new DatosBusqueda();
    orderCuota.orderBy('numeroCuota');
    orderCuota.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.cuotaService.selectByCriteria([criterio, orderCuota]).subscribe({
      next: (cuotas) => {
        this.cuotasMap.set(id, cuotas || []);
        this.cargandoCuotasSet.delete(id);
      },
      error: () => {
        this.cuotasMap.set(id, []);
        this.cargandoCuotasSet.delete(id);
        this.snackBar.open('Error al cargar detalle de cuotas', 'Cerrar', { duration: 3000 });
      },
    });
  }

  getCuotas(participe: ParticipeGeneracionArchivo): CuotaXParticipeGeneracion[] {
    return this.cuotasMap.get(participe.codigo || 0) || [];
  }

  isCargandoCuotas(participe: ParticipeGeneracionArchivo): boolean {
    return this.cargandoCuotasSet.has(participe.codigo || 0);
  }

  volverAtras(): void {
    this.router.navigate(['/menucreditos/archivos-petro/generar/consulta']);
  }
}
