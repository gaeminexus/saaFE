import { CommonModule } from '@angular/common';
import { Component, Inject, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { EstadoNovedadIess, TipoNovedadIess } from '../../../model/estados-novedad-iess';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { CampoFormularioComponent } from '../../comunes/campo-formulario/campo-formulario.component';
import { referenciaSinResolver } from '../../comunes/cuerpo-entidad';
import { CampoFormulario } from '../../comunes/modelo-formulario';

export interface NuevaNovedadData {
  empleados: any[];
  contratos: any[];
  /** Todas las novedades registradas (no solo las del período): sirven para saber quién ya tiene su aviso de salida. */
  novedades?: any[];
}

/** MPLDESTD, rubro 185: 4 CESANTE, 5 JUBILADO. El resto (activo, con licencia, suspendido) sigue siendo personal. */
const EMPLEADO_CESANTE = 4;
const EMPLEADO_JUBILADO = 5;
/**
 * Días, contados desde hoy, durante los que un cesante sigue ofreciéndose para su aviso de salida.
 * Si el aviso se hizo en el portal del IESS y no en el SAA, el sistema no se entera: sin esta
 * ventana el cesante seguiría saliendo como «(salida pendiente)» para siempre. El plazo legal
 * del aviso es corto, así que pasados 60 días de la terminación ya no se ofrece.
 */
const DIAS_VENTANA_SALIDA_PENDIENTE = 60;
const MARCA_SALIDA_PENDIENTE = '(salida pendiente)';

/**
 * Alta manual de una novedad ante el IESS.
 *
 * **Por qué hace falta.** El motor genera solo las novedades que nacen de un hecho que él mismo
 * procesa —la entrada al crear un contrato, la salida al ejecutar un finiquito, la variación al
 * calcular una nómina con extras—. Pero hay hechos que no pasan por el motor: una licencia sin
 * remuneración, un reintegro anticipado. Sin esta pantalla el usuario no puede declararlos, y una
 * novedad no declarada es exactamente lo que le pasó a marzo.
 *
 * **Los campos cambian con el tipo, y no es cosmético.** El archivo de carga masiva pide datos
 * distintos en cada registro (`NORMATIVA-IESS-NOVEDADES.md` §2.2), y el exportador se niega a
 * generar si falta uno. Pedirlos todos siempre obligaría a inventar valores; pedir sólo los del
 * tipo elegido es lo que hace que el archivo salga a la primera.
 */
@Component({
  selector: 'app-nueva-novedad-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    CampoFormularioComponent,
  ],
  templateUrl: './nueva-novedad-dialog.component.html',
  styleUrls: ['./nueva-novedad-dialog.component.scss'],
})
export class NuevaNovedadDialogComponent {
  formulario: FormGroup;

  readonly aviso = signal<string | null>(null);
  readonly tipoElegido = signal<number | null>(null);

  /**
   * Si el tipo elegido **no** viaja en el archivo de carga masiva.
   *
   * No es una lista escrita aquí: se deduce de `PDTRVLRV` del rubro 204, que es de donde el
   * exportador saca el código de tres letras del archivo (`ENT`, `SAL`, `MSU`…). Un detalle sin
   * ese valor es un tipo que el IESS sólo admite registrado en el portal uno por uno —hoy la
   * licencia sin remuneración, el reintegro anticipado y el cambio de relación o actividad
   * sectorial—. Leerlo del rubro y no de una constante evita que la pantalla y el exportador
   * digan cosas distintas el día que el IESS habilite el archivo de alguno.
   *
   * Se avisa **al elegir el tipo** y no al intentar exportar: enterarse después de registrar la
   * novedad es enterarse tarde, y la consecuencia —que alguien la dé por enviada sin haberla
   * subido— es justo la que deja un mes mal declarado.
   */
  readonly seRegistraEnElPortal = computed(() => {
    const tipo = this.tipoElegido();
    if (tipo === null) return false;
    return this.detalleRubroService.getAlfanumericoByParentAndAlterno(
      RubrosRrh.TIPO_NOVEDAD_IESS,
      tipo,
    ) === null;
  });

  private contratosPorEmpleado = new Map<number, any[]>();

  /** Campos fijos: los pide cualquier novedad, sea del tipo que sea. */
  readonly camposComunes = signal<CampoFormulario[]>([]);

  /**
   * Lo que además pide el tipo elegido.
   *
   * La correspondencia sale de `NORMATIVA-IESS-NOVEDADES.md` §5.1 y §5.2. Los tipos que no
   * aparecen aquí no piden nada más que los comunes.
   */
  readonly camposDelTipo = computed<CampoFormulario[]>(() => {
    switch (this.tipoElegido()) {
      case TipoNovedadIess.MODIFICACION_DE_SUELDO:
        return [
          { name: 'sueldoAnterior', label: 'Sueldo anterior', tipo: 'numero', requerido: true },
          { name: 'sueldoNuevo', label: 'Sueldo nuevo', tipo: 'numero', requerido: true },
        ];

      case TipoNovedadIess.NOVEDAD_FONDOS_DE_RESERVA:
        return [
          {
            name: 'modalidadFondosReserva',
            label: 'Modalidad de fondos de reserva',
            tipo: 'rubro',
            rubro: RubrosRrh.MODALIDAD_FONDOS_RESERVA,
            requerido: true,
          },
          { name: 'periodoDesde', label: 'Período desde', tipo: 'fecha', requerido: true },
          { name: 'periodoHasta', label: 'Período hasta', tipo: 'fecha', requerido: true },
          { name: 'mesesLaborados', label: 'Meses laborados', tipo: 'numero', requerido: true },
        ];

      case TipoNovedadIess.VARIACION_POR_EXTRAS:
        return [
          {
            name: 'valorVariacion',
            label: 'Valor de la variación',
            tipo: 'numero',
            requerido: true,
            ayuda: 'Lo que se suma al sueldo imponible del mes',
          },
        ];

      // La licencia abre un paréntesis en los aportes y el reintegro lo cierra: la de inicio
      // necesita saber hasta cuándo, la de reintegro es sólo la fecha en que se vuelve.
      case TipoNovedadIess.LICENCIA_SIN_REMUNERACION:
        return [
          {
            name: 'fechaFin',
            label: 'Fecha de fin de la licencia',
            tipo: 'fecha',
            requerido: true,
            ayuda: 'Mientras dure, la persona no genera aportes',
          },
        ];

      case TipoNovedadIess.CAMBIO_DE_JORNADA:
        return [
          {
            name: 'diasDeclarados',
            label: 'Días declarados',
            tipo: 'numero',
            requerido: true,
            ayuda: 'Los que se declaran al IESS en la jornada nueva',
          },
          { name: 'sueldoReferencial', label: 'Sueldo referencial', tipo: 'numero', requerido: true },
        ];

      default:
        return [];
    }
  });

  constructor(
    private fb: FormBuilder,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    public dialogRef: MatDialogRef<NuevaNovedadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NuevaNovedadData,
  ) {
    this.formulario = this.fb.group({});
    this.construir();
  }

  /**
   * Colaboradores que se ofrecen: todos menos cesantes y jubilados, y al final los cesantes a los que
   * todavía les falta el aviso de salida. El aviso de salida es justamente para quien ya se fue: si se ocultara al
   * cesante, ya no se podría registrar.
   *
   * Un cesante sigue apareciendo si la terminación más reciente de sus contratos cae dentro de los
   * últimos `DIAS_VENTANA_SALIDA_PENDIENTE` días y NO tiene una novedad AVISO_DE_SALIDA en estado
   * distinto de ANULADA. Con licencia o suspendido se muestran: se les registran novedades. Sin `estado` conocido se muestra: no
   * se esconde a nadie por un dato que falta.
   */
  private colaboradoresOfrecidos(): any[] {
    const activos: any[] = [];
    const salidaPendiente: any[] = [];
    for (const empleado of this.data.empleados ?? []) {
      const estado = empleado?.estado;
      if (estado === null || estado === undefined) {
        activos.push(empleado);
      } else if (Number(estado) === EMPLEADO_CESANTE) {
        if (this.tieneSalidaPendiente(empleado)) {
          salidaPendiente.push({ ...empleado, marcaSalida: MARCA_SALIDA_PENDIENTE });
        }
      } else if (Number(estado) !== EMPLEADO_JUBILADO) {
        activos.push(empleado);
      }
    }
    return [...activos, ...salidaPendiente];
  }

  private tieneSalidaPendiente(empleado: any): boolean {
    const terminaciones = (this.contratosPorEmpleado.get(empleado.codigo) ?? [])
      .map((c) => this.funcionesDatosS.convertirFechaDesdeBackend(c?.fechaTerminacion))
      .filter((f): f is Date => !!f && !Number.isNaN(f.getTime()));
    if (terminaciones.length === 0) return false;
    const ultima = Math.max(...terminaciones.map((f) => f.getTime()));
    const limite = new Date();
    limite.setHours(0, 0, 0, 0);
    limite.setDate(limite.getDate() - DIAS_VENTANA_SALIDA_PENDIENTE);
    if (ultima < limite.getTime()) return false;
    const yaAvisado = (this.data.novedades ?? []).some(
      (n) =>
        n?.empleado?.codigo === empleado.codigo &&
        Number(n.tipoNovedad) === TipoNovedadIess.AVISO_DE_SALIDA &&
        Number(n.estado) !== EstadoNovedadIess.ANULADA,
    );
    return !yaAvisado;
  }

  private construir(): void {
    this.indexarContratos();

    const comunes: CampoFormulario[] = [
      {
        name: 'empleado',
        label: 'Colaborador',
        tipo: 'referencia',
        coleccion: this.colaboradoresOfrecidos(),
        buscarPor: ['apellidos', 'nombres', 'identificacion'],
        etiquetaOpcion: (e: any) =>
          `${e.apellidos ?? ''} ${e.nombres ?? ''}${e.marcaSalida ? ` ${e.marcaSalida}` : ''}`.trim(),
        detalleOpcion: (e: any) => e.identificacion ?? '',
        anchoPanel: 520,
        requerido: true,
      },
      {
        name: 'contrato',
        label: 'Contrato',
        tipo: 'referencia',
        coleccion: this.data.contratos,
        buscarPor: ['numero', 'fechaInicio'],
        requerido: true,
        ayuda: 'Elija primero el colaborador para acotar la lista',
      },
      {
        name: 'tipoNovedad',
        label: 'Tipo de novedad',
        tipo: 'rubro',
        rubro: RubrosRrh.TIPO_NOVEDAD_IESS,
        requerido: true,
        ayuda: 'Decide qué datos exige el IESS y de cuántos días es el plazo',
      },
      {
        name: 'fechaHecho',
        label: 'Fecha del hecho',
        tipo: 'fecha',
        requerido: true,
        ayuda: 'De aquí cuenta el plazo legal, que calcula el servidor',
      },
      { name: 'observacion', label: 'Observación', tipo: 'texto', ancho: 'completo' },
    ];
    this.camposComunes.set(comunes);

    for (const campo of comunes) {
      this.formulario.addControl(
        campo.name,
        this.fb.control(null, campo.requerido ? Validators.required : []),
      );
    }

    // Al cambiar de colaborador, el contrato deja de ser válido y la lista se acota
    this.formulario.get('empleado')?.valueChanges.subscribe((empleado: any) => {
      const codigo = empleado?.codigo;
      const propios = codigo
        ? (this.contratosPorEmpleado.get(codigo) ?? [])
        : this.data.contratos;
      this.camposComunes.update((lista) =>
        lista.map((c) => (c.name === 'contrato' ? { ...c, coleccion: propios } : c)),
      );
      this.formulario.get('contrato')?.setValue(null, { emitEvent: false });
    });

    // El tipo decide qué controles existen: los del tipo anterior se retiran para que no
    // viajen valores de un formulario que el usuario ya abandonó.
    this.formulario.get('tipoNovedad')?.valueChanges.subscribe((valor: any) => {
      const anteriores = this.camposDelTipo();
      this.tipoElegido.set(valor === null || valor === undefined ? null : Number(valor));
      for (const campo of anteriores) this.formulario.removeControl(campo.name);
      for (const campo of this.camposDelTipo()) {
        this.formulario.addControl(
          campo.name,
          this.fb.control(null, campo.requerido ? Validators.required : []),
        );
      }
    });
  }

  private indexarContratos(): void {
    for (const contrato of this.data.contratos) {
      const codigo = contrato?.empleado?.codigo;
      if (!codigo) continue;
      if (!this.contratosPorEmpleado.has(codigo)) this.contratosPorEmpleado.set(codigo, []);
      this.contratosPorEmpleado.get(codigo)!.push(contrato);
    }
  }

  /**
   * Devuelve los valores al que abrió el diálogo, o corta si algo falta.
   *
   * `referenciaSinResolver` es el defecto 3 de la pantalla: un combo en el que el usuario tecleó
   * y no llegó a elegir se queda con la cadena, y viajaría como `{ codigo: 'BARC' }` para que el
   * backend responda un 400 que no le dice a nadie qué pasó.
   */
  guardar(): void {
    const todos = [...this.camposComunes(), ...this.camposDelTipo()];
    const valores = this.formulario.getRawValue();

    const aMedias = referenciaSinResolver(todos, valores);
    if (aMedias) {
      this.aviso.set(`Elija «${aMedias}» de la lista: no basta con escribirlo.`);
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.aviso.set('Complete los campos obligatorios.');
      return;
    }

    this.aviso.set(null);
    this.dialogRef.close(valores);
  }
}
