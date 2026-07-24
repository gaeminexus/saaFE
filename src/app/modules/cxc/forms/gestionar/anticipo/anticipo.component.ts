import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { Empresa } from '../../../../../shared/model/empresa';
import { Usuario } from '../../../../../shared/model/usuario';
import { AnticipoCliente } from '../../../model/anticipo-cliente';
import { AnticipoClienteService } from '../../../service/anticipo-cliente.service';
import { Titular } from '../../../../tsr/model/titular';
import { PersonaCuentaContableService } from '../../../../tsr/service/persona-cuenta-contable.service';

@Component({
  selector: 'app-anticipo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './anticipo.component.html',
  styleUrl: './anticipo.component.scss',
})
export class AnticipoComponent implements OnInit {
  @ViewChild('fechaAnticipoInput', { read: ElementRef }) fechaAnticipoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaRecepcionInput', { read: ElementRef }) fechaRecepcionInputRef!: ElementRef<HTMLInputElement>;

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private anticipoService = inject(AnticipoClienteService);
  private personaCuentaContableService = inject(PersonaCuentaContableService);
  private funcionesDatosS = inject(FuncionesDatosService);

  private _rawFechaAnticipo = '';
  private _rawFechaRecepcion = '';

  readonly rolTitularCodigo = 1;
  readonly rolTitularNombre = 'CLIENTE';
  readonly tipoCuentaAnticipo = 2;
  readonly tipoPersonaCliente = 1;

  cargando = signal(false);
  guardando = signal(false);
  confirmando = signal(false);
  titularSeleccionado = signal<Titular | null>(null);
  saldoAnticipos = signal(0);
  anticipoActual = signal<AnticipoCliente | null>(null);
  registros = signal<AnticipoCliente[]>([]);

  textoTitular = computed(() => this.displayPersona(this.titularSeleccionado()));
  estadoTexto = computed(() => {
    const estado = Number(this.anticipoActual()?.estado || 1);
    return estado === 2 ? 'Confirmado' : estado === 3 ? 'Anulado' : 'Pendiente';
  });

  dataSource = new MatTableDataSource<AnticipoCliente>([]);
  columnas = ['id', 'fechaAnticipo', 'titular', 'numeroDoc', 'valor', 'estado'];

  id: number | null = null;
  fechaAnticipoControl = new UntypedFormControl(new Date());
  fechaRecepcionControl = new UntypedFormControl(new Date());
  fechaAnticipo = this.hoyISO();
  fechaRecepcion = this.hoyISO();
  numeroDoc = '';
  valor = 0;
  observacion = '';

  ngOnInit(): void {
    this.cargarRegistros();
  }

  buscarTitular(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: this.rolTitularCodigo,
        rolNombre: this.rolTitularNombre,
        titulo: 'Buscar Cliente para anticipo',
      },
    });

    dialogRef.afterClosed().subscribe((titular: Titular | null) => {
      if (titular) {
        this.asignarTitular(titular);
      }
    });
  }

  asignarTitular(titular: Titular): void {
    this.titularSeleccionado.set(titular);
    this.cargarSaldoAnticipos(titular);
  }

  cargarSaldoAnticipos(titular: Titular): void {
    const criterio = {
      tipoCuenta: this.tipoCuentaAnticipo,
      tipoPersona: this.tipoPersonaCliente,
      personaRol: {
        titular: {
          codigo: titular.codigo,
        },
      },
    };

    this.personaCuentaContableService.selectByCriteria(criterio).subscribe({
      next: (rows) => {
        const saldo = Number((rows || [])[0]?.saldoInicial || 0);
        this.saldoAnticipos.set(Number.isFinite(saldo) ? saldo : 0);
      },
      error: () => {
        this.saldoAnticipos.set(0);
        this.mostrarInfo('No se pudo recuperar el saldo de anticipos del cliente');
      },
    });
  }

  grabar(): void {
    const payload = this.construirPayload(1);
    if (!payload) {
      return;
    }

    this.guardando.set(true);
    const request$ = this.id ? this.anticipoService.update(payload) : this.anticipoService.add(payload);

    request$.subscribe({
      next: (resp) => {
        this.guardando.set(false);
        if (resp?.id) {
          this.id = Number(resp.id);
          this.anticipoActual.set(resp as AnticipoCliente);
        }
        this.mostrarExito('Anticipo grabado correctamente');
        this.cargarRegistros();
      },
      error: () => {
        this.guardando.set(false);
        this.mostrarError('No se pudo grabar el anticipo');
      },
    });
  }

  confirmar(): void {
    if (!this.id) {
      this.mostrarInfo('Primero debe grabar el anticipo');
      return;
    }

    this.confirmando.set(true);
    this.anticipoService.confirmar({ idAnticipo: this.id }).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.mostrarExito('Anticipo confirmado correctamente');
        this.cargarRegistros();
      },
      error: () => {
        this.confirmando.set(false);
        this.mostrarError('No se pudo confirmar el anticipo');
      },
    });
  }

  nuevo(): void {
    this.id = null;
    this.aplicarFechaAnticipo(new Date());
    this.aplicarFechaRecepcion(new Date());
    this.numeroDoc = '';
    this.valor = 0;
    this.observacion = '';
    this.anticipoActual.set(null);
    this.titularSeleccionado.set(null);
    this.saldoAnticipos.set(0);
  }

  cargarRegistros(): void {
    this.cargando.set(true);
    this.anticipoService.getAll().subscribe({
      next: (data) => {
        const rows = (data || []).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        this.registros.set(rows);
        this.dataSource.data = rows;
        this.cargando.set(false);
      },
      error: () => {
        this.dataSource.data = [];
        this.registros.set([]);
        this.cargando.set(false);
        this.mostrarError('No se pudieron cargar los anticipos');
      },
    });
  }

  seleccionarRegistro(row: AnticipoCliente): void {
    this.id = Number(row.id || 0);
    this.aplicarFechaAnticipo(this.toDateObj(row.fechaAnticipo));
    this.aplicarFechaRecepcion(this.toDateObj(row.fechaRecepcion));
    this.numeroDoc = row.numeroDoc || '';
    this.valor = Number(row.valor || 0);
    this.observacion = row.observacion || '';
    this.anticipoActual.set(row);

    if (row.titular) {
      this.asignarTitular(row.titular);
    }
  }

  displayPersona(persona: Titular | null): string {
    if (!persona) {
      return '';
    }
    return `${persona.identificacion || ''} - ${persona.razonSocial || persona.nombre || ''}`.trim();
  }

  nombreTitular(row: AnticipoCliente): string {
    return row.titular?.razonSocial || row.titular?.nombre || '';
  }

  private construirPayload(estado: number): Partial<AnticipoCliente> | null {
    const titular = this.titularSeleccionado();
    if (!titular) {
      this.mostrarInfo('Debe seleccionar un cliente');
      return null;
    }

    if (!this.numeroDoc.trim()) {
      this.mostrarInfo('Debe ingresar el número de documento');
      return null;
    }

    if (Number(this.valor) <= 0) {
      this.mostrarInfo('El valor del anticipo debe ser mayor a cero');
      return null;
    }

    return {
      id: this.id || undefined,
      titular,
      fechaAnticipo: this.fechaAnticipo,
      fechaRecepcion: this.fechaRecepcion,
      usuario: this.usuarioSesion(),
      fechaRegistro: new Date().toISOString(),
      numeroDoc: this.numeroDoc.trim(),
      valor: Number(this.valor),
      estado,
      empresa: this.empresaSesion(),
      observacion: this.observacion.trim(),
    };
  }

  private usuarioSesion(): Usuario {
    const raw = localStorage.getItem('usuario');
    if (raw) {
      try {
        return JSON.parse(raw) as Usuario;
      } catch {
        // continue
      }
    }
    return { codigo: 0, jerarquia: { codigo: 0, nombre: '' } as any, nombre: 'SISTEMA', nivel: 0, codigoPadre: 0, ingresado: 0 };
  }

  private empresaSesion(): Empresa {
    const raw = localStorage.getItem('empresa');
    if (raw) {
      try {
        return JSON.parse(raw) as Empresa;
      } catch {
        // continue
      }
    }
    return { codigo: 0, jerarquia: { codigo: 0, nombre: '' } as any, nombre: '', nivel: 0, codigoPadre: 0, ingresado: 0 };
  }

  private toDateObj(value: string | Date | undefined): Date {
    if (!value) return new Date();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private hoyISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private aplicarFechaAnticipo(date: Date): void {
    this.fechaAnticipoControl.setValue(date, { emitEvent: false });
    this.fechaAnticipo = date.toISOString().slice(0, 10);
    const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaAnticipoInputRef?.nativeElement) this.fechaAnticipoInputRef.nativeElement.value = formatted;
    });
  }

  private aplicarFechaRecepcion(date: Date): void {
    this.fechaRecepcionControl.setValue(date, { emitEvent: false });
    this.fechaRecepcion = date.toISOString().slice(0, 10);
    const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaRecepcionInputRef?.nativeElement) this.fechaRecepcionInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaAnticipoRaw(event: Event): void {
    this._rawFechaAnticipo = (event.target as HTMLInputElement).value;
  }

  syncFechaAnticipoFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaAnticipo || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaAnticipo = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.aplicarFechaAnticipo(date);
      }
    }
  }

  onFechaAnticipoPickerChange(date: Date | null | undefined): void {
    this.aplicarFechaAnticipo(date || new Date());
  }

  capturarFechaRecepcionRaw(event: Event): void {
    this._rawFechaRecepcion = (event.target as HTMLInputElement).value;
  }

  syncFechaRecepcionFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaRecepcion || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaRecepcion = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.aplicarFechaRecepcion(date);
      }
    }
  }

  onFechaRecepcionPickerChange(date: Date | null | undefined): void {
    this.aplicarFechaRecepcion(date || new Date());
  }

  private mostrarExito(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }

  private mostrarInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }

  private mostrarError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4500, panelClass: ['snackbar-error'] });
  }
}
