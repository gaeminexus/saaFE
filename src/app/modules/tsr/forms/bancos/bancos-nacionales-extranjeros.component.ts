import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { Banco } from '../../model/banco';
import { BancoService } from '../../service/banco.service';

@Component({
  selector: 'app-bancos-nacionales-extranjeros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './bancos-nacionales-extranjeros.component.html',
  styleUrls: ['./bancos-nacionales-extranjeros.component.scss'],
})
export class BancosNacionalesExtranjerosComponent implements OnInit {
  // Estado UI
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Datos
  allData = signal<Banco[]>([]);
  pageData = signal<Banco[]>([]);
  totalItems = signal<number>(0);

  // Paginación
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);

  // Filtro
  filtro = signal<string>('');

  // Formulario
  nombre = '';
  tipoBancoSeleccion: DetalleRubro | null = null;
  permiteDescuadre = false;
  estado: 0 | 1 = 1;

  // Rubros tipo de banco (id 24)
  rubrosTipoBanco = signal<DetalleRubro[]>([]);

  displayedColumns: string[] = ['codigo', 'nombre', 'tipo', 'permite', 'estado'];
  hasItems = computed(() => this.pageData().length > 0);

  constructor(
    private bancoService: BancoService,
    private detalleRubroService: DetalleRubroService
  ) {}

  ngOnInit(): void {
    this.cargarRubrosTipoBanco();
    this.cargarDatos();
  }

  cargarRubrosTipoBanco(): void {
    // Rubro 24: Tipo de banco
    // Preferir caché local si DetalleRubroService ya fue inicializado
    const cached = this.detalleRubroService.getDetallesByParent(24);
    if (Array.isArray(cached) && cached.length > 0) {
      this.rubrosTipoBanco.set(cached);
      return;
    }

    // Fallback a obtener desde backend
    this.detalleRubroService.getRubros(24).subscribe({
      next: (rubros) => {
        this.rubrosTipoBanco.set(Array.isArray(rubros) ? rubros : []);
      },
      error: () => {
        this.errorMsg.set('Error al cargar rubros de tipo de banco');
      },
    });
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    // Priorizar selectByCriteria con orderBy por defecto; fallback a getAll
    const criterios: DatosBusqueda[] = [];
    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('codigo');
    criterios.push(dbOrder);

    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        this.allData.set(items);
        this.totalItems.set(items.length);
        this.pageIndex.set(0);
        this.updatePageData();
        this.loading.set(false);
      },
      error: () => {
        // Fallback a GET si criteria falla
        this.bancoService.getAll().subscribe({
          next: (data2) => {
            const items2 = Array.isArray(data2) ? data2 : [];
            this.allData.set(items2);
            this.totalItems.set(items2.length);
            this.pageIndex.set(0);
            this.updatePageData();
            this.loading.set(false);
          },
          error: () => {
            this.errorMsg.set('Error al cargar bancos');
            this.loading.set(false);
          },
        });
      },
    });
  }

  guardar(): void {
    if (!this.formValido()) {
      return;
    }
    const payload: any = {
      nombre: this.nombre?.trim(),
      // Campos según pantalla clásica
      permiteDescuadre: this.permiteDescuadre,
      estado: this.estado,
    };

    // Mapear rubro seleccionado si existe (convención P/H como en otros modelos)
    if (this.tipoBancoSeleccion) {
      payload.rubroTipoBancoP = this.tipoBancoSeleccion.rubro?.codigoAlterno ?? 24;
      payload.rubroTipoBancoH = this.tipoBancoSeleccion.codigoAlterno;
    }

    this.loading.set(true);
    this.bancoService.add(payload).subscribe({
      next: () => {
        // Recargar listado tras crear
        this.nombre = '';
        this.tipoBancoSeleccion = null;
        this.permiteDescuadre = false;
        this.estado = 1;
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo guardar el banco');
        this.loading.set(false);
      },
    });
  }

  mostrarTipo(row: Banco): string {
    // Resolver nombre del tipo usando catálogo cargado
    const p: number = (row as any).rubroTipoBancoP;
    const h: number = (row as any).rubroTipoBancoH;
    const found = this.rubrosTipoBanco().find(
      (r) => r.rubro?.codigoAlterno === p && r.codigoAlterno === h
    );
    return found ? found.descripcion : '—';
  }

  formValido(): boolean {
    return !!this.nombre?.trim() && !!this.tipoBancoSeleccion;
  }

  onTipoBancoChange(rubro: DetalleRubro | null): void {
    this.tipoBancoSeleccion = rubro;
  }

  aplicarFiltro(value: string): void {
    this.filtro.set(value || '');
    this.pageIndex.set(0);
    this.updatePageData();
  }

  updatePageData(): void {
    const filtroTxt = this.filtro().toLowerCase();
    const filtered = this.allData().filter((item) => {
      const base = `${(item as any).codigo ?? ''} ${(item as any).nombre ?? ''}`.toLowerCase();
      return base.includes(filtroTxt);
    });

    this.totalItems.set(filtered.length);
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    this.pageData.set(filtered.slice(start, end));
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePageData();
  }

  trackByCodigo(index: number, item: Banco): number {
    return (item as any).codigo;
  }

  trackByCodigoAlterno(index: number, item: DetalleRubro): number {
    return item.codigoAlterno;
  }

  mostrarPermite(row: Banco): string {
    const p = !!(row as any).permiteDescuadre;
    return p ? 'Sí' : 'No';
  }

  mostrarEstado(row: Banco): string {
    const e = (row as any).estado;
    return e === 1 ? 'Activo' : 'Inactivo';
  }
}
