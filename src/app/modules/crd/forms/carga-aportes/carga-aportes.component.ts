import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Filial } from '../../model/filial';
import { FilialService } from '../../service/filial.service';

interface Mes {
  valor: number;
  nombre: string;
}

interface RegistroAporte {
  codigoAporte: string;
  descripcionAporte: string;
  codigo: string;
  nombre: string;
  plazoInicial: string;
  saldoActual: string;
  mesesPlazo: string;
  interesAnual: string;
  valorSeguro: string;
  totalDescontar: string;
  capitalDescontado: string;
  interesDescontado: string;
  seguroDescontado: string;
  totalDescontado: string;
  capitalNoDescontado: string;
  interesNoDescontado: string;
  desgravamenNoDescontado: string;
}

interface AporteAgrupado {
  codigoAporte: string;
  descripcionAporte: string;
  registros: RegistroAporte[];
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
  filiales: Filial[] = [];

  // Carga de archivos
  nombreArchivo: string = '';
  registrosProcesados: RegistroAporte[] = [];
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

  constructor(
    private filialService: FilialService,
    private snackBar: MatSnackBar
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    this.cargarFiliales();
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
  }

  getFilialNombre(codigo: number | null): string {
    if (!codigo) return 'N/A';
    const filial = this.filiales.find(f => f.codigo === codigo);
    return filial?.nombre || 'N/A';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.nombreArchivo = file.name;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const contenido = e.target?.result as string;
      this.procesarArchivo(contenido);
    };

    reader.onerror = () => {
      this.snackBar.open('Error al leer el archivo', 'Cerrar', { duration: 3000 });
    };

    // Intentar leer como ISO-8859-1 (Latin1) que es común en archivos Windows antiguos
    reader.readAsText(file, 'ISO-8859-1');
  }

  procesarArchivo(contenido: string): void {
    try {
      const lineas = contenido.split('\n');
      this.registrosProcesados = [];

      let i = 0;

      while (i < lineas.length) {
        const lineaActual = lineas[i];

        // Verificar si la línea empieza con "EP"
        if (lineaActual && lineaActual.trim().startsWith('EP')) {
          // Saltar 8 líneas
          i += 8;

          if (i >= lineas.length) break;

          // Línea con código y descripción del aporte
          const lineaAporte = lineas[i];
          const codigoAporte = lineaAporte.substring(0, 4).trim();
          const descripcionAporte = lineaAporte.substring(4).trim();

          i++; // Siguiente línea

          // Ignorar la siguiente línea
          i++;

          if (i >= lineas.length) break;

          // Procesar líneas de datos hasta encontrar otra línea "EP" o fin de archivo
          while (i < lineas.length) {
            const lineaRegistro = lineas[i];

            // Si encontramos otra línea "EP", salimos del bucle interno
            if (lineaRegistro && lineaRegistro.trim().startsWith('EP')) {
              break;
            }

            // Procesar la línea de datos si no está vacía
            if (lineaRegistro && lineaRegistro.trim().length > 0) {
              const registro: RegistroAporte = {
                codigoAporte: codigoAporte,
                descripcionAporte: descripcionAporte,
                codigo: this.extraerCampo(lineaRegistro, 0, 7).trim(),
                nombre: this.extraerCampo(lineaRegistro, 7, 44).trim(),
                plazoInicial: this.extraerCampo(lineaRegistro, 44, 50).trim(),
                saldoActual: this.extraerCampo(lineaRegistro, 50, 61).trim(),
                mesesPlazo: this.extraerCampo(lineaRegistro, 61, 65).trim(),
                interesAnual: this.extraerCampo(lineaRegistro, 65, 70).trim(),
                valorSeguro: this.extraerCampo(lineaRegistro, 70, 80).trim(),
                totalDescontar: this.extraerCampo(lineaRegistro, 80, 95).trim(),
                capitalDescontado: this.extraerCampo(lineaRegistro, 95, 110).trim(),
                interesDescontado: this.extraerCampo(lineaRegistro, 110, 125).trim(),
                seguroDescontado: this.extraerCampo(lineaRegistro, 125, 140).trim(),
                totalDescontado: this.extraerCampo(lineaRegistro, 140, 155).trim(),
                capitalNoDescontado: this.extraerCampo(lineaRegistro, 155, 170).trim(),
                interesNoDescontado: this.extraerCampo(lineaRegistro, 170, 184).trim(),
                desgravamenNoDescontado: this.extraerCampo(lineaRegistro, 184, 198).trim()
              };

              // Solo agregar si tiene código válido
              if (registro.codigo) {
                this.registrosProcesados.push(registro);
              }
            }

            i++; // Avanzar a la siguiente línea
          }

          // No incrementar i aquí porque ya apunta a la línea "EP" o al final
          continue;
        }

        i++; // Avanzar a la siguiente línea
      }

      // Agrupar registros por código de aporte
      this.agruparPorAporte();

      this.snackBar.open(
        `Archivo procesado: ${this.totalRegistros} registros en ${this.aporteAgrupados.length} aportes`,
        'Cerrar',
        { duration: 4000 }
      );

    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      this.snackBar.open('Error al procesar el archivo', 'Cerrar', { duration: 3000 });
      this.registrosProcesados = [];
      this.aporteAgrupados = [];
    }
  }

  /**
   * Agrupa los registros procesados por código de aporte
   */
  private agruparPorAporte(): void {
    const mapaAportes = new Map<string, AporteAgrupado>();

    this.registrosProcesados.forEach(registro => {
      const key = registro.codigoAporte;

      if (!mapaAportes.has(key)) {
        mapaAportes.set(key, {
          codigoAporte: registro.codigoAporte,
          descripcionAporte: registro.descripcionAporte,
          registros: [],
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
          }
        });
      }

      const aporte = mapaAportes.get(key)!;
      aporte.registros.push(registro);

      // Calcular totales
      aporte.totales.saldoActual += this.parseNumber(registro.saldoActual);
      aporte.totales.interesAnual += this.parseNumber(registro.interesAnual);
      aporte.totales.valorSeguro += this.parseNumber(registro.valorSeguro);
      aporte.totales.totalDescontar += this.parseNumber(registro.totalDescontar);
      aporte.totales.capitalDescontado += this.parseNumber(registro.capitalDescontado);
      aporte.totales.interesDescontado += this.parseNumber(registro.interesDescontado);
      aporte.totales.seguroDescontado += this.parseNumber(registro.seguroDescontado);
      aporte.totales.totalDescontado += this.parseNumber(registro.totalDescontado);
      aporte.totales.capitalNoDescontado += this.parseNumber(registro.capitalNoDescontado);
      aporte.totales.interesNoDescontado += this.parseNumber(registro.interesNoDescontado);
      aporte.totales.desgravamenNoDescontado += this.parseNumber(registro.desgravamenNoDescontado);
    });

    this.aporteAgrupados = Array.from(mapaAportes.values());
    this.totalRegistros = this.registrosProcesados.length;

    // Calcular totales generales
    this.calcularTotalesGenerales();
  }

  /**
   * Calcula los totales generales sumando todos los totales de cada aporte
   */
  private calcularTotalesGenerales(): void {
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

    this.aporteAgrupados.forEach(aporte => {
      this.totalesGenerales.saldoActual += aporte.totales.saldoActual;
      this.totalesGenerales.interesAnual += aporte.totales.interesAnual;
      this.totalesGenerales.valorSeguro += aporte.totales.valorSeguro;
      this.totalesGenerales.totalDescontar += aporte.totales.totalDescontar;
      this.totalesGenerales.capitalDescontado += aporte.totales.capitalDescontado;
      this.totalesGenerales.interesDescontado += aporte.totales.interesDescontado;
      this.totalesGenerales.seguroDescontado += aporte.totales.seguroDescontado;
      this.totalesGenerales.totalDescontado += aporte.totales.totalDescontado;
      this.totalesGenerales.capitalNoDescontado += aporte.totales.capitalNoDescontado;
      this.totalesGenerales.interesNoDescontado += aporte.totales.interesNoDescontado;
      this.totalesGenerales.desgravamenNoDescontado += aporte.totales.desgravamenNoDescontado;
    });
  }

  /**
   * Convierte un string a número, manejando espacios y formatos
   * Asume formato con punto como separador de miles y coma como separador decimal
   * Ejemplos: "1.234,56" -> 1234.56, "1234,56" -> 1234.56, "1234.56" -> 1234.56
   */
  private parseNumber(valor: string): number {
    if (!valor || valor.trim() === '') return 0;

    let valorLimpio = valor.trim();

    // Remover espacios en blanco
    valorLimpio = valorLimpio.replace(/\s/g, '');

    // Detectar si usa coma como decimal o punto como decimal
    const tieneComa = valorLimpio.includes(',');
    const tienePunto = valorLimpio.includes('.');

    if (tieneComa && tienePunto) {
      // Formato: 1.234,56 (europeo) - punto es separador de miles, coma es decimal
      valorLimpio = valorLimpio.replace(/\./g, '').replace(',', '.');
    } else if (tieneComa) {
      // Formato: 1234,56 (europeo) - coma es decimal
      valorLimpio = valorLimpio.replace(',', '.');
    }
    // Si solo tiene punto, asumimos que ya está en formato correcto (1234.56)

    const numero = parseFloat(valorLimpio);
    return isNaN(numero) ? 0 : numero;
  }

  /**
   * Extrae un campo de una línea desde la columna inicio hasta la columna fin
   * @param linea La línea completa del archivo
   * @param inicio Índice de inicio (base 0)
   * @param fin Índice de fin (exclusivo)
   */
  private extraerCampo(linea: string, inicio: number, fin: number): string {
    if (!linea) return '';
    // Asegurar que la línea tenga suficiente longitud
    const lineaCompleta = linea.padEnd(fin, ' ');
    return lineaCompleta.substring(inicio, fin);
  }
}
