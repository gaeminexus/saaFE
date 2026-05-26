import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { InformacionGeneralFondoService } from '../../../service/informacion-general-fondo.service';
import { InformacionGeneralFondo } from '../../../model/informacion-general-fondo';

@Component({
  selector: 'app-informacion-general-fondo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './informacion-general-fondo.component.html',
  styleUrl: './informacion-general-fondo.component.scss',
})
export class InformacionGeneralFondoComponent implements OnInit {
  form!: FormGroup;

  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  registroExistente = signal<boolean>(false);
  codigoRegistro = signal<number | null>(null);
  errorMsg = signal<string>('');

  // Opciones para selects — código:etiqueta según catálogo BE
  readonly tiposIdentificacion: { valor: string; label: string }[] = [
    { valor: 'C', label: 'Cédula' },
    { valor: 'R', label: 'RUC' },
    { valor: 'P', label: 'Pasaporte' },
  ];
  readonly tiposSistema: { valor: string; label: string }[] = [
    { valor: 'I', label: 'Individual' },
    { valor: 'S', label: 'Solidario' },
    { valor: 'M', label: 'Mixto' },
  ];
  readonly tiposPrestacion: { valor: string; label: string }[] = [
    { valor: 'C', label: 'Cesantía' },
    { valor: 'J', label: 'Jubilación' },
    { valor: 'M', label: 'Mixto (Cesantía + Jubilación)' },
  ];
  readonly tiposAporte: { valor: string; label: string }[] = [
    { valor: 'P', label: 'Patronal y Personal' },
    { valor: 'V', label: 'Voluntario' },
    { valor: 'M', label: 'Mixto' },
  ];
  readonly tiposAdministracion: { valor: string; label: string }[] = [
    { valor: 'B', label: 'Por sí mismo (Propia)' },
    { valor: 'D', label: 'Delegada' },
    { valor: 'M', label: 'Mixta' },
  ];
  readonly tiposFcpc: { valor: string; label: string }[] = [
    { valor: 'I',   label: 'Tipo I' },
    { valor: 'II',  label: 'Tipo II' },
    { valor: 'III', label: 'Tipo III' },
    { valor: 'IV',  label: 'Tipo IV' },
  ];

  constructor(
    private fb: FormBuilder,
    private igfService: InformacionGeneralFondoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.inicializarForm();
    this.cargarDatos();
  }

  private inicializarForm(): void {
    this.form = this.fb.group({
      // Identificación
      tipoIdentificacionFcpc: ['R', Validators.required],
      identificacionFcpc: ['1791367596001', Validators.required],
      tipoFcpc: ['III', Validators.required],

      // Resolución principal
      numeroResolucion: ['SBS-2011-277', Validators.required],
      fechaResolucion: [new Date(2011, 2, 31), Validators.required], // 31/03/2011
      fechaTraspaso: [null],

      // Ubicación y contacto
      provincia: ['Pichincha', Validators.required],
      canton: ['Quito', Validators.required],
      direccion: ['Shyris N34-382 y Portugal', Validators.required],
      telefonos: ['22255112'],
      correoElectronico: ['financiero@asoprep.com.ec', [Validators.email]],

      // Configuración del sistema
      tipoSistema: ['I', Validators.required],
      tipoPrestacion: ['M', Validators.required],
      tipoAporte: ['P', Validators.required],
      tipoAdministracion: ['B', Validators.required],

      // Cambio de estatuto
      numeroResolucionCambioEstatuto: ['SB-DTL-2022-1263'],
      fechaResolucionCambioEstatuto: [new Date(2022, 6, 18)], // 18/07/2022
      cambioNombre: ['ASOCIACIÓN DEL FONDO COMPLEMENTARIO PREVISIONAL CERRADO ASOPREP-FCPC, DE JUBILACIÓN Y CESANTÍA DE LAS EMPRESAS PÚBLICAS DEL SECTOR HIDROCARBURÍFERO'],

      // Porcentajes - Cesantía
      porcentajeAportePatronalCesantia: [5, [Validators.min(0), Validators.max(100)]],
      porcentajeAportePersonalCesantia: [2, [Validators.min(0), Validators.max(100)]],
      valorAportePersonalCesantia: [18629701.95, [Validators.min(0)]],

      // Porcentajes - Jubilación
      porcentajeAportePatronalJubilacion: [0, [Validators.min(0), Validators.max(100)]],
      porcentajeAportePersonalJubilacion: [5, [Validators.min(0), Validators.max(100)]],
      valorAportePersonalJubilacion: [33462534.21, [Validators.min(0)]],
    });
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.igfService.getAll().subscribe({
      next: (data) => {
        this.loading.set(false);
        if (data && data.length > 0) {
          const registro = data[0];
          this.registroExistente.set(true);
          this.codigoRegistro.set(registro.codigo ?? null);
          this.form.patchValue({
            tipoIdentificacionFcpc: registro.tipoIdentificacionFcpc,
            identificacionFcpc: registro.identificacionFcpc,
            tipoFcpc: registro.tipoFcpc,
            numeroResolucion: registro.numeroResolucion,
            fechaResolucion: this.parseFecha(registro.fechaResolucion),
            fechaTraspaso: this.parseFecha(registro.fechaTraspaso),
            provincia: registro.provincia,
            canton: registro.canton,
            direccion: registro.direccion,
            telefonos: registro.telefonos,
            correoElectronico: registro.correoElectronico,
            tipoSistema: registro.tipoSistema,
            tipoPrestacion: registro.tipoPrestacion,
            tipoAporte: registro.tipoAporte,
            tipoAdministracion: registro.tipoAdministracion,
            numeroResolucionCambioEstatuto: registro.numeroResolucionCambioEstatuto,
            fechaResolucionCambioEstatuto: this.parseFecha(registro.fechaResolucionCambioEstatuto),
            cambioNombre: registro.cambioNombre,
            porcentajeAportePatronalCesantia: registro.porcentajeAportePatronalCesantia,
            porcentajeAportePersonalCesantia: registro.porcentajeAportePersonalCesantia,
            valorAportePersonalCesantia: registro.valorAportePersonalCesantia,
            porcentajeAportePatronalJubilacion: registro.porcentajeAportePatronalJubilacion,
            porcentajeAportePersonalJubilacion: registro.porcentajeAportePersonalJubilacion,
            valorAportePersonalJubilacion: registro.valorAportePersonalJubilacion,
          });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set('Error al cargar la información del fondo.');
        console.error('[InformacionGeneralFondo] Error al cargar:', err);
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete los campos obligatorios.', 'Cerrar', {
        duration: 3000,
        panelClass: ['snack-warn'],
      });
      return;
    }

    this.saving.set(true);
    const payload: InformacionGeneralFondo = {
      codigo: this.codigoRegistro() ?? null as any,
      ...this.form.value,
      fechaResolucion: this.formatFecha(this.form.value.fechaResolucion),
      fechaTraspaso: this.formatFecha(this.form.value.fechaTraspaso),
      fechaResolucionCambioEstatuto: this.formatFecha(this.form.value.fechaResolucionCambioEstatuto),
    };

    const operacion$ = this.registroExistente()
      ? this.igfService.update(payload)
      : this.igfService.add(payload);

    operacion$.subscribe({
      next: (resp) => {
        this.saving.set(false);
        if (resp) {
          this.registroExistente.set(true);
          this.codigoRegistro.set(resp.codigo ?? null);
          this.snackBar.open('Información guardada correctamente.', 'OK', {
            duration: 3000,
            panelClass: ['snack-success'],
          });
        }
      },
      error: (err) => {
        this.saving.set(false);
        console.error('[InformacionGeneralFondo] Error al guardar:', err);
        this.snackBar.open('Error al guardar. Intente nuevamente.', 'Cerrar', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  private parseFecha(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (Array.isArray(value) && value.length >= 3) {
      return new Date(value[0], value[1] - 1, value[2]);
    }
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  private formatFecha(value: any): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
