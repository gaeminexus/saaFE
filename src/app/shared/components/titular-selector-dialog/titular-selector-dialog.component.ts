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

  columnas = ['identificacion', 'nombre', 'direccion', 'telefono', 'acciones'];
  dataSource = new MatTableDataSource<Titular>([]);

  constructor(@Inject(MAT_DIALOG_DATA) public data: TitularSelectorDialogData) {
    this.filtroControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.buscar(String(value || ''));
    });

    this.buscar('');
  }

  buscar(termino: string): void {
    this.cargando.set(true);
    this.personaClienteService.buscarTitularesPorRol(termino || '', this.data.rolCodigo).subscribe({
      next: (titulares) => {
        const rows = titulares || [];
        this.titulares.set(rows);
        this.dataSource.data = rows;
        this.cargando.set(false);
      },
      error: () => {
        this.titulares.set([]);
        this.dataSource.data = [];
        this.cargando.set(false);
      },
    });
  }

  seleccionar(titular: Titular): void {
    this.titularSeleccionado.set(titular);
    this.dialogRef.close(titular);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
