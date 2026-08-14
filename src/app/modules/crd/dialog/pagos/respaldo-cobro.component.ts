import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../tsr/service/cuenta-bancaria.service';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';

/** Formas en que puede entrar dinero de fuera del sistema. El débito de aportes no es una de ellas. */
export type MetodoCobro = 'transferencia' | 'deposito';

/** Lo que el cajero registra sobre el dinero que recibió. */
export interface DatosRespaldoCobro {
  metodo: MetodoCobro;
  /** Cuenta de ASOPREP en la que ingresó el dinero. */
  cuenta: CuentaBancaria | null;
  referencia: string;
  archivo: File | null;
}

/**
 * Bloque «Respaldo del cobro»: banco receptor, número de referencia y comprobante digitalizado.
 *
 * Todo dinero que entra por transferencia o depósito llega por fuera del sistema, así que el único
 * rastro de que existió es lo que se registre acá. Está como componente aparte —y no repetido en
 * cada diálogo— porque la regla es una sola para todos los flujos de cobro (pago de cuotas, abono a
 * capital y precancelación) y antes solo la aplicaba la pantalla de cobros personales: las
 * operaciones hechas desde los diálogos quedaban sin banco, sin referencia y sin respaldo.
 *
 * El componente solo captura y valida. Quien lo usa lee `completo()` para habilitar su botón de
 * confirmar y `datos()` para subir el archivo antes de llamar al endpoint.
 */
@Component({
  selector: 'app-respaldo-cobro',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './respaldo-cobro.component.html',
  styleUrl: './respaldo-cobro.component.scss',
})
export class RespaldoCobroComponent implements OnInit {
  private cuentaBancariaService = inject(CuentaBancariaService);
  private comprobantes = inject(ComprobanteCobroService);
  private snackBar = inject(MatSnackBar);

  /**
   * Si el cobro mueve dinero de fuera del sistema. En `false` el bloque se muestra apagado y no
   * exige nada: es el caso del pago que sale del saldo de aportes, que no tiene respaldo externo.
   */
  requerido = input(true);

  /** Monto que este respaldo justifica. Solo para el texto de ayuda. */
  monto = input<number | null>(null);

  /** Valores que la pantalla que abre el diálogo ya capturó, para no pedirlos dos veces. */
  inicial = input<Partial<DatosRespaldoCobro> | null>(null);

  metodo = signal<MetodoCobro>('transferencia');
  cuenta = signal<CuentaBancaria | null>(null);
  referencia = signal('');
  archivo = signal<File | null>(null);

  cuentas = signal<CuentaBancaria[]>([]);
  cargandoCuentas = signal(false);

  readonly extensionesAceptadas = this.comprobantes.extensionesAceptadas;

  /** Qué falta para que el cobro tenga respaldo. Se muestra en el bloque y bloquea la confirmación. */
  faltantes = computed<string[]>(() => {
    if (!this.requerido()) return [];
    const motivos: string[] = [];
    if (!this.cuenta()) motivos.push('Seleccione la cuenta de ASOPREP en la que ingresó el dinero.');
    if (!this.referencia().trim()) motivos.push('Ingrese el número de referencia de la transferencia o depósito.');
    if (!this.archivo()) motivos.push('Adjunte el comprobante digitalizado (PDF o imagen).');
    return motivos;
  });

  completo = computed(() => this.faltantes().length === 0);

  ngOnInit(): void {
    const inicial = this.inicial();
    if (inicial?.metodo) this.metodo.set(inicial.metodo);
    if (inicial?.referencia) this.referencia.set(inicial.referencia);
    if (inicial?.archivo) this.archivo.set(inicial.archivo);
    this.cargarCuentas();
  }

  /** Datos capturados, para que el diálogo suba el archivo y arme la observación. */
  datos(): DatosRespaldoCobro {
    return {
      metodo: this.metodo(),
      cuenta: this.cuenta(),
      referencia: this.referencia().trim(),
      archivo: this.archivo(),
    };
  }

  /**
   * Resumen para la observación de la operación. El backend guarda una sola observación por pago,
   * así que el banco y la referencia viajan ahí: es el dato con el que después se concilia el
   * movimiento contra el extracto bancario.
   */
  resumen(): string {
    const partes: string[] = [this.metodo() === 'transferencia' ? 'Transferencia bancaria' : 'Depósito directo'];
    const referencia = this.referencia().trim();
    if (referencia) partes.push(`Ref. ${referencia}`);
    const cuenta = this.cuenta();
    if (cuenta) partes.push(`Cta. ${cuenta.banco?.nombre ?? ''} ${cuenta.numeroCuenta ?? ''}`.trim());
    return partes.join(' · ');
  }

  /**
   * Cuentas de ASOPREP que pueden recibir el cobro: vigentes (CNBCESTD = 1) y habilitadas para
   * cobro de crédito (CNBCCBCR = 1). El filtro va en el criterio de búsqueda, no del lado del
   * cliente: `getAll` trae todas las cuentas de tesorería, incluidas las de pagos y las dadas de
   * baja, y ninguna de esas es un destino válido para un cobro de préstamo.
   */
  cargarCuentas(): void {
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);

    const criterioCobroCredito = new DatosBusqueda();
    criterioCobroCredito.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'cobroCredito', '1', TipoComandosBusqueda.IGUAL);

    this.cargandoCuentas.set(true);
    this.cuentaBancariaService.selectByCriteria([criterioEstado, criterioCobroCredito]).subscribe({
      next: (cuentas) => {
        this.cargandoCuentas.set(false);
        const habilitadas = (cuentas ?? []).filter(
          (c) => Number(c.estado) === 1 && Number(c.cobroCredito) === 1
        );
        this.cuentas.set(habilitadas);
        // La cuenta precargada llega como un objeto de otra consulta: el `mat-select` compara por
        // identidad, así que hay que quedarse con la instancia de esta lista.
        const sugerida = this.inicial()?.cuenta;
        if (sugerida) this.cuenta.set(habilitadas.find((c) => c.codigo === sugerida.codigo) ?? null);
      },
      error: () => {
        this.cargandoCuentas.set(false);
        this.snackBar.open('No se pudieron cargar las cuentas bancarias de ASOPREP.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Se rechaza el archivo al seleccionarlo y no al confirmar: para entonces la operación ya estaría
   * registrada y el comprobante quedaría sin subir.
   */
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file) {
      const problema = this.comprobantes.problemaDelArchivo(file);
      if (problema) {
        input.value = '';
        this.snackBar.open(problema, 'Cerrar', { duration: 5000 });
        return;
      }
    }

    this.archivo.set(file);
  }

  quitarArchivo(): void {
    this.archivo.set(null);
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
