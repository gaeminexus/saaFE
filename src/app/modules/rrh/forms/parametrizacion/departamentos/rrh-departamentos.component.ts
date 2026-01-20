import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { departamentocargo } from '../../../model/departamento-cargo';
import { DepartementoCargoService } from '../../../service/departemento-cargo.service';

@Component({
  selector: 'app-rrh-departamentos',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    FormsModule,
  ],
  templateUrl: './rrh-departamentos.component.html',
  styleUrls: ['./rrh-departamentos.component.scss'],
})
export class RrhDepartamentosComponent implements OnInit {
  titulo = signal<string>('Parametrización · Departamentos');
  columns = signal<string[]>(['nombre', 'estado', 'acciones']);

  // Estado
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  // Datos
  data = signal<departamentocargo[]>([]);
  selected = signal<departamentocargo | null>(null);
  hasData = computed(() => this.data().length > 0);

  // Formulario (Signals + ngModel bridge)
  formNombre = signal<string>('');
  // Estado usa códigos de 1 char en DB: 'A' (Activo), 'I' (Inactivo)
  formEstado = signal<string>('A');

  // Mapeo para mostrar etiquetas amigables
  estadoDict: Record<string, string> = { A: 'Activo', I: 'Inactivo' };

  // Paginación local (slice)
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.data().slice(start, end);
  });

  constructor(private service: DepartementoCargoService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.service.getAll().subscribe({
      next: (rows) => {
        this.data.set(rows ?? []);
        // Reset paginación al cargar
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar departamentos');
        this.loading.set(false);
      },
    });
  }

  onNuevo(): void {
    this.selected.set(null);
    this.formNombre.set('');
    this.formEstado.set('A');
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  onEditar(row: departamentocargo): void {
    this.selected.set(row);
    this.formNombre.set(row?.nombre ?? '');
    const est = (row?.estado ?? 'A').toString();
    // Acepta tanto códigos ('A'/'I') como etiquetas ('Activo'/'Inactivo')
    const code =
      est.length === 1 ? est.toUpperCase() : est.toUpperCase().startsWith('A') ? 'A' : 'I';
    this.formEstado.set(code);
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  onGuardar(): void {
    const nombre = this.formNombre().trim();
    const estado = this.formEstado().trim(); // 'A' | 'I'
    if (!nombre) {
      this.errorMsg.set('El nombre es obligatorio');
      return;
    }

    const current = this.selected();
    const isUpdate = !!current?.codigo && current.codigo > 0;
    const payload: Partial<departamentocargo> = {
      nombre,
      estado,
    };
    if (isUpdate) {
      payload.codigo = current!.codigo;
      payload.fechaRegistro = current?.fechaRegistro ?? new Date();
      payload.usuarioRegistro = this.truncateUsuario(
        String(current?.usuarioRegistro ?? this.getUsuarioRegistro()),
      );
    } else {
      payload.fechaRegistro = new Date();
      payload.usuarioRegistro = this.getUsuarioRegistro();
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    const obs = isUpdate ? this.service.update(payload) : this.service.add(payload);
    obs.subscribe({
      next: () => {
        this.successMsg.set('Guardado correctamente');
        this.onNuevo();
        this.loadData();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al guardar');
        this.loading.set(false);
      },
    });
  }

  onEliminar(row: departamentocargo): void {
    if (!row?.codigo) return;
    if (!confirm(`¿Eliminar departamento "${row.nombre}"?`)) return;

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.service.delete(row.codigo).subscribe({
      next: () => {
        this.successMsg.set('Eliminado correctamente');
        this.loadData();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al eliminar');
        this.loading.set(false);
      },
    });
  }

  onCancelar(): void {
    this.onNuevo();
  }

  onVolver(): void {
    history.back();
  }

  trackByCodigo(index: number, item: departamentocargo): number {
    return item.codigo;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  estadoLabel(code?: string | null): string {
    const c = (code ?? '').toString();
    if (!c) return '';
    const key = c.length === 1 ? c.toUpperCase() : c.toUpperCase().startsWith('A') ? 'A' : 'I';
    return this.estadoDict[key] ?? c;
  }

  private getUsuarioRegistro(): string {
    const raw =
      localStorage.getItem('usuarioRegistro') ||
      localStorage.getItem('usuario') ||
      localStorage.getItem('username') ||
      localStorage.getItem('user') ||
      'web';
    return this.truncateUsuario(String(raw));
  }

  private truncateUsuario(v: string): string {
    return v.length > 59 ? v.substring(0, 59) : v;
  }
}
