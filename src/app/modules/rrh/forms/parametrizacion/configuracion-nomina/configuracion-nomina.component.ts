import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConfiguracionNomina } from '../../../model/configuracion-nomina';
import { ConfiguracionNominaService } from '../../../service/configuracion-nomina.service';
import { criteriosPorEmpresa, referenciaEmpresa } from '../utiles-parametrizacion';

/** Códigos alternos de plantilla y tipo de asiento, agrupados por proceso contable. */
const ASIENTOS = [
  { proceso: 'Rol de pagos', plantilla: 'plantillaRol', tipo: 'tipoAsientoRol' },
  { proceso: 'Provisiones', plantilla: 'plantillaProvision', tipo: 'tipoAsientoProvision' },
  { proceso: 'Pago de nómina', plantilla: 'plantillaPago', tipo: 'tipoAsientoPago' },
  { proceso: 'Liquidación', plantilla: 'plantillaLiquidacion', tipo: 'tipoAsientoLiquidacion' },
];

/** Banderas de funcionalidad de la empresa. */
const BANDERAS = [
  { name: 'desglosaCentroCosto', label: 'Desglosar el asiento por centro de costo' },
  { name: 'aplicaUtilidades', label: 'Reparte utilidades del 15 %' },
  { name: 'aplicaJubilacionPatronal', label: 'Provisiona jubilación patronal' },
  { name: 'aplicaDesahucio', label: 'Provisiona desahucio' },
  { name: 'redondeaRenglon', label: 'Redondear cada renglón antes de sumar' },
];

/**
 * Configuración de nómina de la empresa (RHH.CFNM). Un único registro por empresa.
 *
 * Aquí se declaran los códigos alternos de las plantillas y tipos de asiento contable, de modo
 * que el proceso de contabilización no lleve ningún código escrito.
 */
@Component({
  selector: 'app-configuracion-nomina',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './configuracion-nomina.component.html',
  styleUrls: ['./configuracion-nomina.component.scss'],
})
export class ConfiguracionNominaComponent implements OnInit {
  asientos = ASIENTOS;
  banderas = BANDERAS;
  formulario: FormGroup;
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  existe = signal<boolean>(false);

  private registro: ConfiguracionNomina | null = null;

  constructor(
    private fb: FormBuilder,
    private configuracionService: ConfiguracionNominaService,
    private snackBar: MatSnackBar,
  ) {
    const controles: Record<string, any> = { toleranciaCuadre: [null] };
    for (const a of ASIENTOS) {
      controles[a.plantilla] = [null];
      controles[a.tipo] = [null];
    }
    for (const b of BANDERAS) {
      controles[b.name] = [false];
    }
    this.formulario = this.fb.group(controles);
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.configuracionService.selectByCriteria(criteriosPorEmpresa()).subscribe({
      next: (data) => {
        this.aplicarRegistro(data && data.length > 0 ? data[0] : null);
        this.cargando.set(false);
      },
      error: () => {
        this.aplicarRegistro(null);
        this.cargando.set(false);
        this.avisar('No se pudo cargar la configuración de nómina', true);
      },
    });
  }

  private aplicarRegistro(registro: ConfiguracionNomina | null): void {
    this.registro = registro;
    this.existe.set(!!registro);
    this.formulario.reset();

    if (!registro) return;

    this.formulario.patchValue({
      toleranciaCuadre: registro.toleranciaCuadre,
      ...Object.fromEntries(
        ASIENTOS.flatMap((a) => [
          [a.plantilla, (registro as any)[a.plantilla]],
          [a.tipo, (registro as any)[a.tipo]],
        ]),
      ),
      ...Object.fromEntries(BANDERAS.map((b) => [b.name, (registro as any)[b.name] === 'S'])),
    });
  }

  guardar(): void {
    const valores = this.formulario.value;
    const payload: any = {
      ...valores,
      empresa: referenciaEmpresa(),
      estado: this.registro?.estado ?? 1,
      usuarioRegistro: usuarioSesion(),
    };
    // El backend guarda las banderas como 'S' / 'N', no como booleano
    for (const b of BANDERAS) {
      payload[b.name] = valores[b.name] ? 'S' : 'N';
    }
    if (this.registro?.codigo) payload.codigo = this.registro.codigo;

    this.guardando.set(true);
    const peticion = this.registro?.codigo
      ? this.configuracionService.update(payload)
      : this.configuracionService.add(payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar('Configuración guardada');
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.avisar(typeof err === 'string' ? err : err?.message || 'No se pudo guardar', true);
      },
    });
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: esError ? 8000 : 4000,
      panelClass: [esError ? 'snackbar-error' : 'snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
