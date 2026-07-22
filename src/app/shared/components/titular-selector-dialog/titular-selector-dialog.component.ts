import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MaterialFormModule } from '../../modules/material-form.module';
import { Titular } from '../../../modules/tsr/model/titular';
import { PersonaClienteEmitirService } from '../../../modules/cxc/service/emitir/persona-cliente-emitir.service';

export interface TitularSelectorDialogData {
  rolCodigo: number;
  rolNombre: string;
  titulo?: string;
}

@Component({
  selector: 'app-titular-selector-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './titular-selector-dialog.component.html',
  styleUrl: './titular-selector-dialog.component.scss',
})
export class TitularSelectorDialogComponent {
  private dialogRef = inject(MatDialogRef<TitularSelectorDialogComponent, Titular | null>);
  private personaClienteService = inject(PersonaClienteEmitirService);

  filtroControl = new UntypedFormControl('');
  cargando = signal(false);
  titulares = signal<Titular[]>([]);
  titularSeleccionado = signal<Titular | null>(null);

  /** Todos los registros cargados del backend (sin filtrar) */
  private todosLosTitulares: Titular[] = [];

  columnas = ['identificacion', 'nombre', 'direccion', 'telefono', 'acciones'];
  dataSource = new MatTableDataSource<Titular>([]);

  constructor(@Inject(MAT_DIALOG_DATA) public data: TitularSelectorDialogData) {
    this.filtroControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.filtrarLocalmente(String(value || ''));
    });

    this.cargarTodos();
  }

  /** Carga todos los titulares del rol una sola vez desde el backend */
  cargarTodos(): void {
    this.cargando.set(true);
    this.personaClienteService.buscarTitularesPorRol('', this.data.rolCodigo).subscribe({
      next: (titulares) => {
        this.todosLosTitulares = titulares || [];
        this.titulares.set(this.todosLosTitulares);
        this.dataSource.data = this.todosLosTitulares;
        this.cargando.set(false);
      },
      error: () => {
        this.todosLosTitulares = [];
        this.titulares.set([]);
        this.dataSource.data = [];
        this.cargando.set(false);
      },
    });
  }

  /** Filtra localmente los titulares ya cargados por nombre, razón social o identificación */
  filtrarLocalmente(termino: string): void {
    const t = (termino || '').trim().toLowerCase();
    const filtrados = !t
      ? this.todosLosTitulares
      : this.todosLosTitulares.filter((titular) => {
          const nombre = (titular.nombre || '').toLowerCase();
          const razon = (titular.razonSocial || '').toLowerCase();
          const ident = (titular.identificacion || '').toLowerCase();
          return nombre.includes(t) || razon.includes(t) || ident.includes(t);
        });
    this.titulares.set(filtrados);
    this.dataSource.data = filtrados;
  }

  /** @deprecated Mantener por compatibilidad. Usa cargarTodos() + filtrarLocalmente() */
  buscar(termino: string): void {
    this.filtrarLocalmente(termino);
  }

  seleccionar(titular: Titular): void {
    this.titularSeleccionado.set(titular);
    this.dialogRef.close(titular);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
