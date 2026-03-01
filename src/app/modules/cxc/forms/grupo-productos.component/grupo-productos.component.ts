import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

import { GrupoProductoCobro } from '../../model/grupo-producto-cobro';
import { ProductoCobro } from '../../model/producto-cobro';
import { PlanCuenta } from '../../../cnt/model/plan-cuenta';

import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';

import { AppStateService } from '../../../../shared/services/app-state.service';

import { GrupoProductoCobroService } from '../../service/grupo-producto-cobro.service';
import { ProductoCobroService } from '../../service/producto-cobro.service';

/** Código del rubro padre para Tipo de Grupo de Producto */
const RUBRO_TIPO_GRUPO_PRODUCTO = 74;

@Component({
  selector: 'app-grupo-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './grupo-productos.component.html',
  styleUrl: './grupo-productos.component.scss',
})
export class GrupoProductosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private grupoService = inject(GrupoProductoCobroService);
  private productoService = inject(ProductoCobroService);
  private detalleRubroService = inject(DetalleRubroService);
  private appState = inject(AppStateService);

  // ── Estado general ──────────────────────────────────────────────────────────
  cargando = signal(false);
  guardando = signal(false);
  modoGrupo = signal<'lista' | 'nuevo' | 'editar'>('lista');
  modoProducto = signal<'lista' | 'nuevo' | 'editar'>('lista');

  // ── Grupos ──────────────────────────────────────────────────────────────────
  grupos = signal<GrupoProductoCobro[]>([]);
  grupoSeleccionado = signal<GrupoProductoCobro | null>(null);
  filtroBusqueda = signal('');

  gruposFiltrados = computed(() => {
    const filtro = this.filtroBusqueda().toLowerCase();
    return this.grupos().filter(
      (g) =>
        !filtro ||
        g.nombre?.toLowerCase().includes(filtro) ||
        g.planCuenta?.cuentaContable?.toLowerCase().includes(filtro) ||
        g.planCuenta?.nombre?.toLowerCase().includes(filtro)
    );
  });

  // ── Productos del grupo seleccionado ────────────────────────────────────────
  productos = signal<ProductoCobro[]>([]);
  dataSourceProductos = new MatTableDataSource<ProductoCobro>([]);
  columnasProductos: string[] = ['numero', 'nombre', 'aplicaIVA', 'aplicaRetencion', 'estado', 'acciones'];

  // ── Opciones de Tipo de Grupo (rubro 74) ────────────────────────────────────
  tiposGrupoOptions = signal<DetalleRubro[]>([]);

  // ── Formulario Grupo ────────────────────────────────────────────────────────
  formGrupo!: FormGroup;
  planCuentaSeleccionada = signal<PlanCuenta | null>(null);

  // ── Formulario Producto ─────────────────────────────────────────────────────
  formProducto!: FormGroup;
  productoEditando = signal<ProductoCobro | null>(null);

  // ── Opciones ─────────────────────────────────────────────────────────────────
  readonly opcionesSiNo = [
    { value: 1, label: 'Sí' },
    { value: 0, label: 'No' },
  ];
  readonly opcionesEstado = [
    { value: 1, label: 'Activo' },
    { value: 2, label: 'Inactivo' },
  ];

  // ── Empresa (desde AppStateService) ────────────────────────────────────────
  private get empresa() {
    return this.appState.getEmpresa();
  }

  // ────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForms();
    this.tiposGrupoOptions.set(
      this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_GRUPO_PRODUCTO)
    );
    this.cargarGrupos();
  }

  private initForms(): void {
    this.formGrupo = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      rubroTipoGrupoH: [null, Validators.required],
      planCuenta: [null, Validators.required],
      estado: [1, Validators.required],
    });

    this.formProducto = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      numero: ['', [Validators.required, Validators.maxLength(20)]],
      aplicaIVA: [1, Validators.required],
      aplicaRetencion: [0, Validators.required],
      porcentajeBaseRetencion: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
      estado: [1, Validators.required],
    });
  }

  // ══ GRUPOS ══════════════════════════════════════════════════════════════════

  cargarGrupos(): void {
    this.cargando.set(true);
    const criterios: DatosBusqueda[] = [];

    if (this.empresa?.codigo) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(TipoDatos.LONG, 'empresa', 'codigo', this.empresa.codigo.toString(), TipoComandosBusqueda.IGUAL);
      criterios.push(db);
    }

    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('nombre');
    criterios.push(dbOrder);

    this.grupoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.grupos.set(data || []);
        this.cargando.set(false);
      },
      error: () => {
        // El backend retorna error cuando no encuentra registros — tratar como lista vacía
        this.grupos.set([]);
        this.cargando.set(false);
      },
    });
  }

  seleccionarGrupo(grupo: GrupoProductoCobro): void {
    this.grupoSeleccionado.set(grupo);
    this.modoGrupo.set('editar');
    this.modoProducto.set('lista');
    this.planCuentaSeleccionada.set(grupo.planCuenta || null);
    this.formGrupo.patchValue({
      nombre: grupo.nombre,
      rubroTipoGrupoH: grupo.rubroTipoGrupoH || null,
      planCuenta: grupo.planCuenta?.codigo || null,
      estado: grupo.estado,
    });
    this.cargarProductosPorGrupo(grupo.codigo);
  }

  nuevoGrupo(): void {
    this.grupoSeleccionado.set(null);
    this.modoGrupo.set('nuevo');
    this.modoProducto.set('lista');
    this.planCuentaSeleccionada.set(null);
    this.productos.set([]);
    this.dataSourceProductos.data = [];
    this.formGrupo.reset({ rubroTipoGrupoH: null, estado: 1 });
  }

  cancelarGrupo(): void {
    if (this.grupoSeleccionado()) {
      this.modoGrupo.set('editar');
    } else {
      this.modoGrupo.set('lista');
      this.formGrupo.reset();
    }
  }

  guardarGrupo(): void {
    if (this.formGrupo.invalid) {
      this.formGrupo.markAllAsTouched();
      return;
    }

    const planCuenta = this.planCuentaSeleccionada();
    if (!planCuenta) {
      this.showMessage('Debe seleccionar una cuenta contable', 'warn');
      return;
    }

    this.guardando.set(true);
    const valores = this.formGrupo.value;

    const payload: any = {
      nombre: valores.nombre,
      rubroTipoGrupoP: RUBRO_TIPO_GRUPO_PRODUCTO,
      rubroTipoGrupoH: valores.rubroTipoGrupoH,
      planCuenta: { codigo: planCuenta.codigo },
      estado: valores.estado,
      empresa: this.empresa,
    };

    const grupoActual = this.grupoSeleccionado();
    if (grupoActual) {
      payload.codigo = grupoActual.codigo;
      this.grupoService.update(payload).subscribe({
        next: () => {
          this.showMessage('Grupo actualizado correctamente', 'success');
          this.guardando.set(false);
          this.cargarGrupos();
        },
        error: () => {
          this.showMessage('Error al actualizar el grupo', 'error');
          this.guardando.set(false);
        },
      });
    } else {
      this.grupoService.add(payload).subscribe({
        next: (nuevo) => {
          this.showMessage('Grupo creado correctamente', 'success');
          this.guardando.set(false);
          this.cargarGrupos();
          if (nuevo) this.seleccionarGrupo(nuevo);
        },
        error: () => {
          this.showMessage('Error al crear el grupo', 'error');
          this.guardando.set(false);
        },
      });
    }
  }

  eliminarGrupo(grupo: GrupoProductoCobro): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar Grupo',
      message: `¿Está seguro de que desea eliminar el grupo "${grupo.nombre}"? Se eliminarán también todos sus productos.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '460px', data });
    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.grupoService.delete(grupo.codigo).subscribe({
        next: () => {
          this.showMessage('Grupo eliminado', 'success');
          this.grupos.update((gs) => gs.filter((g) => g.codigo !== grupo.codigo));
          if (this.grupoSeleccionado()?.codigo === grupo.codigo) {
            this.grupoSeleccionado.set(null);
            this.modoGrupo.set('lista');
            this.productos.set([]);
            this.dataSourceProductos.data = [];
          }
        },
        error: () => this.showMessage('Error al eliminar el grupo', 'error'),
      });
    });
  }

  // ══ PLAN DE CUENTAS ══════════════════════════════════════════════════════════

  abrirSelectorCuenta(): void {
    const ref = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        cuentaPreseleccionada: this.planCuentaSeleccionada(),
        titulo: 'Seleccionar Cuenta Contable',
        mostrarSoloMovimiento: true,
      },
    });
    ref.afterClosed().subscribe((cuenta: PlanCuenta | undefined) => {
      if (cuenta) {
        this.planCuentaSeleccionada.set(cuenta);
        this.formGrupo.patchValue({ planCuenta: cuenta.codigo });
      }
    });
  }

  // ══ PRODUCTOS ════════════════════════════════════════════════════════════════

  cargarProductosPorGrupo(grupoCodigo: number): void {
    const criterios: DatosBusqueda[] = [];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(TipoDatos.LONG, 'grupoProductoCobro', 'codigo', grupoCodigo.toString(), TipoComandosBusqueda.IGUAL);
    criterios.push(db);

    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('numero');
    criterios.push(dbOrder);

    this.productoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.productos.set(data || []);
        this.dataSourceProductos.data = data || [];
      },
      error: () => {
        // El backend retorna error cuando no encuentra registros — tratar como lista vacía
        this.productos.set([]);
        this.dataSourceProductos.data = [];
      },
    });
  }

  nuevoProducto(): void {
    this.productoEditando.set(null);
    this.modoProducto.set('nuevo');
    this.formProducto.reset({
      aplicaIVA: 1,
      aplicaRetencion: 0,
      porcentajeBaseRetencion: 100,
      estado: 1,
    });
  }

  editarProducto(producto: ProductoCobro): void {
    this.productoEditando.set(producto);
    this.modoProducto.set('editar');
    this.formProducto.patchValue({
      nombre: producto.nombre,
      numero: producto.numero,
      aplicaIVA: producto.aplicaIVA,
      aplicaRetencion: producto.aplicaRetencion,
      porcentajeBaseRetencion: producto.porcentajeBaseRetencion,
      estado: producto.estado,
    });
  }

  cancelarProducto(): void {
    this.modoProducto.set('lista');
    this.productoEditando.set(null);
    this.formProducto.reset();
  }

  guardarProducto(): void {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }
    const grupo = this.grupoSeleccionado();
    if (!grupo) return;

    this.guardando.set(true);
    const valores = this.formProducto.value;

    const payload: any = {
      ...valores,
      grupoProductoCobro: { codigo: grupo.codigo },
      empresa: this.empresa,
      nivel: 1,
      tipoNivel: 2,
    };

    const productoActual = this.productoEditando();
    if (productoActual) {
      payload.codigo = productoActual.codigo;
      this.productoService.update(payload).subscribe({
        next: () => {
          this.showMessage('Producto actualizado correctamente', 'success');
          this.guardando.set(false);
          this.modoProducto.set('lista');
          this.cargarProductosPorGrupo(grupo.codigo);
        },
        error: () => {
          this.showMessage('Error al actualizar el producto', 'error');
          this.guardando.set(false);
        },
      });
    } else {
      this.productoService.add(payload).subscribe({
        next: () => {
          this.showMessage('Producto creado correctamente', 'success');
          this.guardando.set(false);
          this.modoProducto.set('lista');
          this.cargarProductosPorGrupo(grupo.codigo);
        },
        error: () => {
          this.showMessage('Error al crear el producto', 'error');
          this.guardando.set(false);
        },
      });
    }
  }

  eliminarProducto(producto: ProductoCobro): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar Producto',
      message: `¿Está seguro de que desea eliminar el producto "${producto.nombre}"?`,
      type: 'danger',
      confirmText: 'Eliminar',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '440px', data });
    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.productoService.delete(producto.codigo).subscribe({
        next: () => {
          this.showMessage('Producto eliminado', 'success');
          const grupo = this.grupoSeleccionado();
          if (grupo) this.cargarProductosPorGrupo(grupo.codigo);
        },
        error: () => this.showMessage('Error al eliminar el producto', 'error'),
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: [`${type}-snackbar`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  get tituloPanel(): string {
    if (this.modoGrupo() === 'nuevo') return 'Nuevo Grupo de Producto';
    const g = this.grupoSeleccionado();
    return g ? g.nombre : 'Seleccione un grupo';
  }
}
