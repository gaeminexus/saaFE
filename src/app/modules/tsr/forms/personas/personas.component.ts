import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface PersonaRow {
  tipoPersona: string;
  tipoIdentificacion: string;
  identificacion: string;
  apellido: string;
  nombre: string;
  razonSocial: string;
  estado: string;
}

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './personas.component.html',
  styleUrls: ['./personas.component.scss'],
})
export class PersonasComponent {
  title = 'INGRESO DE PERSONA';

  // Grid superior
  personas = signal<PersonaRow[]>([]);
  displayedColumns = [
    'tipoPersona',
    'tipoIdentificacion',
    'identificacion',
    'apellido',
    'nombre',
    'razonSocial',
    'estado',
  ];

  // Panel derecho - checks
  esCliente = signal<boolean>(true);
  esProveedor = signal<boolean>(false);
  esBeneficiario = signal<boolean>(false);
  esEmpleado = signal<boolean>(false);

  // Panel derecho - IVA
  aplicaIva = signal<boolean>(false);
  aplicaRetencion = signal<boolean>(false);

  // Formulario inferior
  tipoPersonaSel = signal<string | null>(null);
  tipoIdentSel = signal<string | null>(null);
  identificacion = signal<string>('');
  apellidos = signal<string>('');
  nombres = signal<string>('');
  estadoSel = signal<string | null>(null);
  razonSocial = signal<string>('');

  constructor() {
    // Mock data for shell
    this.personas.set([
      {
        tipoPersona: 'NATURAL',
        tipoIdentificacion: 'CEDULA',
        identificacion: '1719239301',
        apellido: 'PASQUEL',
        nombre: 'NECK',
        razonSocial: '',
        estado: 'ACTIVO',
      },
      {
        tipoPersona: 'NATURAL',
        tipoIdentificacion: 'CEDULA',
        identificacion: '1719239327',
        apellido: 'BENSON',
        nombre: 'EDUARDO',
        razonSocial: '',
        estado: 'ACTIVO',
      },
    ]);
  }

  insertar(): void {}
  eliminar(): void {}
  modificar(): void {}
  aceptar(): void {}
  cancelar(): void {}
}
