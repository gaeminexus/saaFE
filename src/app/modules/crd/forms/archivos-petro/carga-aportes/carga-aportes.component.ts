import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Filial } from '../../../model/filial';
import { CargaArchivo } from '../../../model/carga-archivo';
import { FilialService } from '../../../service/filial.service';
import { CargaArchivoService } from '../../../service/carga-archivo.service';
import { ServiciosAsoprepService } from '../../../../asoprep/service/servicios-asoprep.service';
import { Usuario } from '../../../../../shared/model/usuario';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { ArchivoPetroService, AporteAgrupado } from '../../../../asoprep/service/archivo-petro.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';


interface Mes {
  valor: number;
  nombre: string;
}

@Component({
  selector: 'app-carga-aportes',
  standalone: true,
  imports: [
    FormsModule,
    MaterialFormModule
  ],
  templateUrl: './carga-aportes.component.html',
  styleUrl: './carga-aportes.component.scss'
})
export class CargaAportesComponent implements OnInit {
  // Filtros
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;
  filialSeleccionada: number | null = null;

  // Estados de habilitación
  anioDeshabilitado: boolean = true;
  mesDeshabilitado: boolean = true;

  // Datos para los combos
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
  mesesDeshabilitados: number[] = []; // Meses que ya tienen carga
  filiales: Filial[] = [];

  // Carga de archivos
  nombreArchivo: string = '';
  archivoSeleccionado: File | null = null;
  archivoValido: boolean = false;
  mensajeErrorArchivo: string = '';
  aporteAgrupados: AporteAgrupado[] = [];
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

  // Loading states
  isLoadingFiliales: boolean = false;
  isUploadingFile: boolean = false;
  cargaExitosa: boolean = false;

  constructor(
    private filialService: FilialService,
    private serviciosAsoprep: ServiciosAsoprepService,
    private snackBar: MatSnackBar,
    private archivoPetroService: ArchivoPetroService,
    private cargaArchivoService: CargaArchivoService
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    this.cargarFiliales();
  }

  /**
   * Convierte texto Unicode a bytes ISO-8859-1 como string
   * Cuando el backend recibe el JSON como UTF-8 pero lo interpreta como ISO-8859-1,
   * necesitamos enviar los caracteres en formato que coincida con esa interpretación.
   *
   * Ejemplo: Ñ (U+00D1, char code 209) se envía tal cual,
   * para que el backend al interpretar el byte 0xD1 lo vea como Ñ en ISO-8859-1
   */
  private convertirUnicodeAISO88591(texto: string): string {
    if (!texto) return texto;

    // Convertir cada carácter a su byte ISO-8859-1 equivalente
    let resultado = '';
    for (let i = 0; i < texto.length; i++) {
      const charCode = texto.charCodeAt(i);
      // Si el char code está en rango ISO-8859-1 (0-255), usar directamente
      if (charCode <= 255) {
        resultado += String.fromCharCode(charCode);
      } else {
        // Si está fuera del rango, reemplazar con ?
        resultado += '?';
      }
    }
    return resultado;
  }

  cargarFiliales(): void {
    this.isLoadingFiliales = true;

    this.filialService.getAll().subscribe({
      next: (filiales: any) => {
        this.isLoadingFiliales = false;
        if (filiales && Array.isArray(filiales)) {
          this.filiales = filiales as Filial[];
        } else {
          this.filiales = [];
        }
      },
      error: (error) => {
        this.isLoadingFiliales = false;
        console.error('Error al cargar filiales:', error);
        this.snackBar.open('Error al cargar filiales', 'Cerrar', { duration: 3000 });
        this.filiales = [];
      }
    });
  }

  limpiarFiltros(): void {
    this.anioSeleccionado = null;
    this.mesSeleccionado = null;
    this.filialSeleccionada = null;

    // Deshabilitar año y mes, pero dejar filial habilitada
    this.anioDeshabilitado = true;
    this.mesDeshabilitado = true;
    this.mesesDeshabilitados = [];

    // Limpiar resultados
    this.aporteAgrupados = [];
    this.nombreArchivo = '';
    this.archivoSeleccionado = null;
    this.archivoValido = false;
    this.mensajeErrorArchivo = '';
    this.cargaExitosa = false;
  }

  onFilialChange(): void {
    // Limpiar año y mes cuando cambie la filial
    this.anioSeleccionado = null;
    this.mesSeleccionado = null;
    this.mesesDeshabilitados = [];

    // Habilitar año solo si hay filial seleccionada
    if (this.filialSeleccionada) {
      this.anioDeshabilitado = false;
    } else {
      this.anioDeshabilitado = true;
      this.mesDeshabilitado = true;
    }

    // Limpiar resultados
    this.aporteAgrupados = [];
    this.nombreArchivo = '';
    this.archivoSeleccionado = null;
    this.archivoValido = false;
    this.mensajeErrorArchivo = '';
  }

  onAnioChange(): void {
    // Limpiar mes cuando cambie el año
    this.mesSeleccionado = null;
    this.mesesDeshabilitados = [];

    if (this.anioSeleccionado && this.filialSeleccionada) {
      // Buscar meses ya cargados para esta filial/año
      this.buscarMesesCargados();
    } else {
      this.mesDeshabilitado = true;
    }

    // Limpiar resultados
    this.aporteAgrupados = [];
    this.nombreArchivo = '';
    this.archivoSeleccionado = null;
    this.archivoValido = false;
    this.mensajeErrorArchivo = '';
  }

  buscarMesesCargados(): void {
    if (!this.filialSeleccionada || !this.anioSeleccionado) {
      this.mesDeshabilitado = true;
      return;
    }

    const criterios: DatosBusqueda[] = [];

    // Filtro por filial
    const dbFilial = new DatosBusqueda();
    dbFilial.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'filial',
      'codigo',
      this.filialSeleccionada.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbFilial);

    // Filtro por año
    const anioValor = this.anioSeleccionado?.toString();
    if (!anioValor) {
      return;
    }

    const dbAnio = new DatosBusqueda();
    dbAnio.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'anioAfectacion',
      anioValor,
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbAnio);

    this.cargaArchivoService.selectByCriteria(criterios).subscribe({
      next: (cargas: CargaArchivo[] | null) => {
        // Extraer los meses que ya tienen carga
        if (cargas && Array.isArray(cargas)) {
          this.mesesDeshabilitados = cargas.map(c => c.mesAfectacion).filter((mes): mes is number => mes !== undefined && mes !== null);
        } else {
          this.mesesDeshabilitados = [];
        }

        // Habilitar el combo de meses
        this.mesDeshabilitado = false;
      },
      error: (error) => {
        console.error('Error al buscar meses cargados:', error);
        this.mesesDeshabilitados = [];
        // Habilitar el combo de meses aunque haya error
        this.mesDeshabilitado = false;
      }
    });
  }

  isMesDeshabilitado(mesValor: number): boolean {
    return this.mesesDeshabilitados.includes(mesValor);
  }

  getFilialNombre(codigo: number | null): string {
    if (!codigo) return 'N/A';
    const filial = this.filiales.find(f => f.codigo === codigo);
    return filial?.nombre || 'N/A';
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validar extensión del archivo
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.txt')) {
      this.mensajeErrorArchivo = `Archivo rechazado: "${file.name}". Solo se permiten archivos con extensión .txt`;
      this.archivoValido = false;
      this.snackBar.open(
        '❌ ERROR: Solo se permiten archivos con extensión .txt',
        'Cerrar',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
      // Limpiar el input
      input.value = '';
      this.nombreArchivo = '';
      this.archivoSeleccionado = null;
      return;
    }

    // Validar tipo MIME (debe ser text/plain)
    if (file.type && file.type !== 'text/plain' && file.type !== '') {
      this.mensajeErrorArchivo = `Archivo rechazado: "${file.name}". Tipo detectado: ${file.type || 'desconocido'}. Solo archivos de texto plano (.txt) son permitidos`;
      this.archivoValido = false;
      this.snackBar.open(
        '❌ ERROR: El archivo seleccionado no es un archivo de texto válido',
        'Cerrar',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
      // Limpiar el input
      input.value = '';
      this.nombreArchivo = '';
      this.archivoSeleccionado = null;
      return;
    }

    // Archivo válido - limpiar mensaje de error
    this.mensajeErrorArchivo = '';
    this.archivoValido = true;
    this.nombreArchivo = file.name;

    try {
      // Leer archivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Leer como ISO-8859-1 para que los substring funcionen con posiciones correctas
      const decoder = new TextDecoder('iso-8859-1');
      const contenidoIso = decoder.decode(new Uint8Array(arrayBuffer));

      // Procesar con ISO-8859-1
      const resultado = await this.archivoPetroService.procesarArchivoPetro(file, this.nombreArchivo);

      // Actualizar estado del componente con los resultados
      this.aporteAgrupados = resultado.aporteAgrupados;
      this.totalRegistros = resultado.totalRegistros;
      this.totalesGenerales = resultado.totalesGenerales;

      // Mantener el archivo original (sin conversión a UTF-8)
      this.archivoSeleccionado = file;

      this.snackBar.open(
        `Archivo procesado: ${this.totalRegistros} registros encontrados`,
        'Cerrar',
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      this.snackBar.open('Error al procesar el archivo', 'Cerrar', { duration: 3000 });
      this.limpiarTodo();
    }
  }

  /**
   * Guarda los datos en BD y luego sube el archivo físico
   * Envía todo en un solo request: archivo + datos JSON
   */
  procesarYSubirArchivo(): void {
    if (!this.archivoSeleccionado) {
      this.snackBar.open('No hay archivo seleccionado', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.anioSeleccionado || !this.mesSeleccionado || !this.filialSeleccionada) {
      this.snackBar.open('Debe seleccionar año, mes y filial', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.aporteAgrupados.length === 0) {
      this.snackBar.open('No hay datos procesados para guardar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isUploadingFile = true;

    // Construir el objeto CargaArchivo
    const filialObj = this.filiales.find(f => f.codigo === this.filialSeleccionada);
    if (!filialObj) {
      this.isUploadingFile = false;
      this.snackBar.open('Error: Filial no encontrada', 'Cerrar', { duration: 3000 });
      return;
    }

    const usuarioActual = this.obtenerUsuarioActual();
    if (!usuarioActual) {
      this.isUploadingFile = false;
      this.snackBar.open('Error: No se pudo obtener el usuario actual', 'Cerrar', { duration: 3000 });
      return;
    }

    const cargaArchivo: Partial<CargaArchivo> = {
      nombre: this.nombreArchivo,
      usuarioCarga: usuarioActual,
      filial: filialObj,
      rutaArchivo: '',
      mesAfectacion: this.mesSeleccionado,
      anioAfectacion: this.anioSeleccionado,
      totalSaldoActual: this.totalesGenerales.saldoActual,
      totalInteresAnual: this.totalesGenerales.interesAnual,
      totalValorSeguro: this.totalesGenerales.valorSeguro,
      totalDescontar: this.totalesGenerales.totalDescontar,
      totalCapitalDescontado: this.totalesGenerales.capitalDescontado,
      totalInteresDescontado: this.totalesGenerales.interesDescontado,
      totalSeguroDescontado: this.totalesGenerales.seguroDescontado,
      totalDescontado: this.totalesGenerales.totalDescontado,
      totalCapitalNoDescontado: this.totalesGenerales.capitalNoDescontado,
      totalInteresNoDescontado: this.totalesGenerales.interesNoDescontado,
      totalDesgravamenNoDescontado: this.totalesGenerales.desgravamenNoDescontado,
      estado: 1
    };

    // Construir arreglos de detalles y partícipes
    const detallesCargaArchivos: any[] = [];
    const participesXCargaArchivo: any[] = [];

    let codigoDetalleSecuencial = 1;

    this.aporteAgrupados.forEach(aporte => {
      const detalle: any = {
        codigo: codigoDetalleSecuencial++, // Asignar código secuencial temporal
        codigoPetroProducto: aporte.codigoAporte,
        nombreProductoPetro: aporte.descripcionAporte, // Sin conversión - el TextDecoder ya lo hizo correctamente
        totalParticipes: aporte.registros.length,
        totalSaldoActual: aporte.totales.saldoActual,
        totalInteresAnual: aporte.totales.interesAnual,
        totalValorSeguro: aporte.totales.valorSeguro,
        totalDescontar: aporte.totales.totalDescontar,
        totalCapitalDescontado: aporte.totales.capitalDescontado,
        totalInteresDescontado: aporte.totales.interesDescontado,
        totalSeguroDescontado: aporte.totales.seguroDescontado,
        totalDescontado: aporte.totales.totalDescontado,
        totalCapitalNoDescontado: aporte.totales.capitalNoDescontado,
        totalInteresNoDescontado: aporte.totales.interesNoDescontado,
        totalDesgravamenNoDescontado: aporte.totales.desgravamenNoDescontado,
        estado: 1
      };
      detallesCargaArchivos.push(detalle);

      // Guardar los partícipes de este detalle con la referencia completa al detalle
      aporte.registros.forEach(registro => {
        const participe: any = {
          detalleCargaArchivo: detalle, // Enviar el objeto completo del detalle
          codigoPetro: parseInt(registro.codigo) || 0,
          nombre: registro.nombre, // Sin conversión - el TextDecoder ya lo hizo correctamente
          plazoInicial: this.archivoPetroService.parseNumber(registro.plazoInicial),
          mesesPlazo: parseInt(registro.mesesPlazo) || 0,
          saldoActual: this.archivoPetroService.parseNumber(registro.saldoActual),
          interesAnual: this.archivoPetroService.parseNumber(registro.interesAnual),
          valorSeguro: this.archivoPetroService.parseNumber(registro.valorSeguro),
          montoDescontar: this.archivoPetroService.parseNumber(registro.totalDescontar),
          capitalDescontado: this.archivoPetroService.parseNumber(registro.capitalDescontado),
          interesDescontado: this.archivoPetroService.parseNumber(registro.interesDescontado),
          seguroDescontado: this.archivoPetroService.parseNumber(registro.seguroDescontado),
          totalDescontado: this.archivoPetroService.parseNumber(registro.totalDescontado),
          capitalNoDescontado: this.archivoPetroService.parseNumber(registro.capitalNoDescontado),
          interesNoDescontado: this.archivoPetroService.parseNumber(registro.interesNoDescontado),
          desgravamenNoDescontado: this.archivoPetroService.parseNumber(registro.desgravamenNoDescontado),
          estado: 1
        };
        participesXCargaArchivo.push(participe);
      });
    });

    // Enviar al servicio (construye FormData internamente)
    this.serviciosAsoprep.almacenaDatosArchivoPetro(
      this.archivoSeleccionado,
      cargaArchivo,
      detallesCargaArchivos,
      participesXCargaArchivo
    ).subscribe({
      next: (response: any) => {
        this.isUploadingFile = false;

        if (response && response.success) {
          this.snackBar.open(
            `✅ Carga completada exitosamente!\n` +
            `Código: ${response.codigoCarga}\n` +
            `Archivo: ${response.rutaArchivo}\n` +
            `${this.totalRegistros} partícipes en ${this.aporteAgrupados.length} productos`,
            'Cerrar',
            { duration: 8000 }
          );

          // Mostrar mensaje de éxito
          this.cargaExitosa = true;

          // NO limpiar inmediatamente - dejar que el usuario vea el mensaje
          // y use el botón "Nueva Carga"
        } else {
          this.snackBar.open(
            `⚠️ Error en la carga: ${response?.message || 'Respuesta inesperada del servidor'}`,
            'Cerrar',
            { duration: 6000 }
          );
        }
      },
      error: (error: any) => {
        this.isUploadingFile = false;
        this.snackBar.open(
          `Error al procesar la carga: ${error.message || error}`,
          'Cerrar',
          { duration: 6000 }
        );
        console.error('Error al procesar carga:', error);
      }
    });
  }

  private obtenerUsuarioActual(): Usuario | null {
    // Obtener usuario completo desde localStorage
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        return JSON.parse(usuarioStr) as Usuario;
      } catch (error) {
        console.error('Error al parsear usuario desde localStorage:', error);
        return null;
      }
    }
    return null;
  }

  private limpiarTodo(): void {
    this.limpiarFiltros();
    this.nombreArchivo = '';
    this.archivoSeleccionado = null;
    this.aporteAgrupados = [];
    this.totalRegistros = 0;
    this.totalesGenerales = {
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

    // Resetear el input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}

