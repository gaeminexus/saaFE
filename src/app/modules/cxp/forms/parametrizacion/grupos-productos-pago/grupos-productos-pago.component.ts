import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { PlanCuentaSelectorDialogComponent } from '../../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

import { GrupoProductoPago } from '../../../model/grupo_producto_pago';
import { ProductoPago } from '../../../model/producto_pago';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';

import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { GrupoProductoPagoService } from '../../../service/grupo-producto-pago.service';
import { ProductoPagoService } from '../../../service/producto-pago.service';

/** Código del rubro para Tipo de Grupo de Producto CXP */
const RUBRO_TIPO_GRUPO_PRODUCTO = 74;

@Component({
  selector: 'app-grupos-productos-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './grupos-productos-pago.component.html',
  styleUrl: './grupos-productos-pago.component.scss',
})
export class GruposProductosPagoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private grupoService = inject(GrupoProductoPagoService);
  private productoService = inject(ProductoPagoService);
  private detalleRubroService = inject(DetalleRubroService);
  private appState = inject(AppStateService);

  // Estado
  cargando = signal(false);
  guardando = signal(false);
  modoVista = signal<'lista' | 'form' | 'productos'>('lista');

  // Grupos
  grupos = signal<GrupoProductoPago[]>([]);
  grupoSeleccionado = signal<GrupoProductoPago | null>(null);
  filtroBusqueda = signal('');

  gruposFiltrados = computed(() => {
    const filtro = this.filtroBusqueda().toLowerCase();
    return this.grupos().filter(
      (g) =>
        !filtro ||
        g.nombre?.toLowerCase().includes(filtro) ||
        g.planCuenta?.cuentaContable?.toLowerCase().includes(filtro)
    );
  });

  // Tabla
  dataSource = new MatTableDataSource<GrupoProductoPago>([]);
  columnasTabla: string[] = ['nombre', 'tipoGrupo', 'planCuenta', 'estado', 'acciones'];

  // Opciones
  tiposGrupoOptions = signal<DetalleRubro[]>([]);

  // Productos
  productos = signal<ProductoPago[]>([]);
  productoSeleccionado = signal<ProductoPago | null>(null);
  dataSourceProductos = new MatTableDataSource<ProductoPago>([]);
  columnasTablaProductos: string[] = ['codigo', 'nombre', 'precioUnitario', 'incluyeIVA', 'stock', 'estado', 'acciones'];
  filtroProductos = signal('');

  productosFiltrados = computed(() => {
    const filtro = this.filtroProductos().toLowerCase();
    return this.productos().filter(
      (p) =>
        !filtro ||
        p.nombre?.toLowerCase().includes(filtro) ||
        p.codigo?.toLowerCase().includes(filtro)
    );
  });

  // Formularios
  formGrupo!: FormGroup;
  formProducto!: FormGroup;
  planCuentaSeleccionada = signal<PlanCuenta | null>(null);
  modoFormProducto = signal<'nuevo' | 'editar'>('nuevo');

  readonly opcionesEstado = [
    { value: 1, label: 'Activo' },
    { value: 2, label: 'Inactivo' },
  ];

  private get empresa() {
    return this.appState.getEmpresa();
  }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.inicializarFormularioProducto();
    this.cargarGrupos();
    this.cargarCatalogos();
  }

  private inicializarFormulario(): void {
    this.formGrupo = this.fb.group({
      codigo: [null],
      empresa: [this.empresa, Validators.required],
      nombre: ['', [Validators.required, Validators.maxLength(250)]],
      rubroTipoGrupoP: [null, Validators.required],
      planCuenta: [null, Validators.required],
      estado: [1, Validators.required],
    });
  }

  private inicializarFormularioProducto(): void {
    this.formProducto = this.fb.group({
      id: [null],
      codigo: ['', [Validators.required, Validators.maxLength(500)]],
      codigoAux: ['', Validators.maxLength(500)],
      nombre: ['', [Validators.required, Validators.maxLength(1000)]],
      descripcion: ['', Validators.maxLength(1000)],
      precioUnitario: [0, [Validators.required, Validators.min(0)]],
      descuento: [0, Validators.min(0)],
      tipoDescuento: [0, Validators.required], // 0 - Valor, 1 - Porcentaje
      incluyeIVA: [0, Validators.required],
      tipoIVA: [0],
      tipoICE: [0],
      ice: [0],
      subsidio: [0],
      precioSinSub: [0],
      irbpnr: [0],
      multiPrecio: [0],
      stock: [0, Validators.min(0)],
      manejaUnidad: [0],
      unidad: [0],
      estado: [1, Validators.required],
    });
  }

  private cargarCatalogos(): void {
    const tipos = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_GRUPO_PRODUCTO);
    if (tipos && tipos.length > 0) {
      this.tiposGrupoOptions.set(tipos);
    }
  }

  cargarGrupos(): void {
    this.cargando.set(true);

    const criterios: DatosBusqueda[] = [];

    if (this.empresa) {
      const dbEmpresa = new DatosBusqueda();
      dbEmpresa.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'empresa',
        'codigo',
        this.empresa.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(dbEmpresa);
    }

    this.grupoService.selectByCriteria(criterios).subscribe({
      next: (grupos) => {
        if (grupos) {
          this.grupos.set(grupos);
          this.dataSource.data = grupos;
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar grupos:', err);
        this.mostrarError('Error al cargar grupos de productos');
        this.cargando.set(false);
      },
    });
  }

  nuevoGrupo(): void {
    this.formGrupo.reset({ empresa: this.empresa, estado: 1 });
    this.planCuentaSeleccionada.set(null);
    this.grupoSeleccionado.set(null);
    this.modoVista.set('form');
  }

  editarGrupo(grupo: GrupoProductoPago): void {
    this.grupoSeleccionado.set(grupo);
    this.planCuentaSeleccionada.set(grupo.planCuenta || null);
    this.formGrupo.patchValue(grupo);
    this.modoVista.set('form');
  }

  getCuentaDisplayText(): string {
    const cuenta = this.planCuentaSeleccionada();
    if (!cuenta) return '';

    const codigo = cuenta.cuentaContable || '';
    const nombre = cuenta.nombre || '';

    if (codigo && nombre) {
      return `${codigo} - ${nombre}`;
    }
    return codigo || nombre;
  }

  getTipoGrupoNombre(codigoTipo: number): string {
    if (!codigoTipo) return '-';
    const tipo = this.tiposGrupoOptions().find(t => t.codigo === codigoTipo);
    return tipo?.descripcion || '-';
  }

  seleccionarPlanCuenta(): void {
    console.log('🔍 Abriendo selector de plan de cuentas...');

    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '80%',
      maxWidth: '900px',
      data: { titulo: 'Seleccionar Cuenta Contable' },
    });

    console.log('✅ Dialog abierto:', dialogRef);

    dialogRef.afterClosed().subscribe((cuenta: PlanCuenta) => {
      console.log('📥 Dialog cerrado con cuenta:', cuenta);
      if (cuenta) {
        this.planCuentaSeleccionada.set(cuenta);
        this.formGrupo.patchValue({ planCuenta: cuenta.codigo });
        console.log('✅ Cuenta seleccionada:', cuenta.cuentaContable, cuenta.nombre);
      }
    });
  }

  guardarGrupo(): void {
    if (this.formGrupo.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      return;
    }

    // Validar que se haya seleccionado una cuenta
    if (!this.planCuentaSeleccionada()) {
      this.mostrarError('Debe seleccionar una cuenta contable');
      return;
    }

    this.guardando.set(true);

    // Construir el objeto con la estructura correcta
    const formValues = this.formGrupo.value;
    const grupo: any = {
      codigo: formValues.codigo || null,
      nombre: formValues.nombre,
      empresa: { codigo: this.empresa?.codigo },
      planCuenta: { codigo: this.planCuentaSeleccionada()!.codigo },
      estado: formValues.estado,
      rubroTipoGrupoP: formValues.rubroTipoGrupoP || 0,
      rubroTipoGrupoH: 0,  // Backend requiere number, no null
    };

    console.log('💾 Guardando grupo:', grupo);

    const operacion$ = this.grupoSeleccionado()
      ? this.grupoService.update(grupo)
      : this.grupoService.add(grupo);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Grupo guardado correctamente');
        this.cargarGrupos();
        this.cancelar();
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('❌ Error al guardar:', err);
        this.mostrarError('Error al guardar grupo');
        this.guardando.set(false);
      },
    });
  }

  eliminarGrupo(grupo: GrupoProductoPago): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar el grupo "${grupo.nombre}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && grupo.codigo) {
        this.grupoService.delete(grupo.codigo).subscribe({
          next: () => {
            this.mostrarExito('Grupo eliminado correctamente');
            this.cargarGrupos();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar grupo');
          },
        });
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE PRODUCTOS
  // ══════════════════════════════════════════════════════════════════════════

  verProductos(grupo: GrupoProductoPago): void {
    this.grupoSeleccionado.set(grupo);
    this.modoVista.set('productos');
    this.cargarProductos();
  }

  cargarProductos(): void {
    const grupo = this.grupoSeleccionado();
    if (!grupo || !grupo.codigo) return;

    this.cargando.set(true);

    const criterios: DatosBusqueda[] = [];

    const dbGrupo = new DatosBusqueda();
    dbGrupo.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'grupoProducto',
      'codigo',
      grupo.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbGrupo);

    this.productoService.selectByCriteria(criterios).subscribe({
      next: (productos) => {
        if (productos) {
          this.productos.set(productos);
          this.dataSourceProductos.data = productos;
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.mostrarError('Error al cargar productos');
        this.cargando.set(false);
      },
    });
  }

  nuevoProducto(): void {
    this.formProducto.reset({
      precioUnitario: 0,
      descuento: 0,
      tipoDescuento: 0,
      incluyeIVA: 0,
      tipoIVA: 0,
      tipoICE: 0,
      ice: 0,
      subsidio: 0,
      precioSinSub: 0,
      irbpnr: 0,
      multiPrecio: 0,
      stock: 0,
      manejaUnidad: 0,
      unidad: 0,
      estado: 1,
    });
    this.productoSeleccionado.set(null);
    this.modoFormProducto.set('nuevo');
  }

  editarProducto(producto: ProductoPago): void {
    this.productoSeleccionado.set(producto);
    this.formProducto.patchValue({
      id: producto.id,
      codigo: producto.codigo,
      codigoAux: producto.codigoAux,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precioUnitario: producto.precioUnitario || 0,
      descuento: producto.descuento || 0,
      tipoDescuento: producto.tipoDescuento || 0,
      incluyeIVA: producto.incluyeIVA || 0,
      tipoIVA: producto.tipoIVA || 0,
      tipoICE: producto.tipoICE || 0,
      ice: producto.ice || 0,
      subsidio: producto.subsidio || 0,
      precioSinSub: producto.precioSinSub || 0,
      irbpnr: producto.irbpnr || 0,
      multiPrecio: producto.multiPrecio || 0,
      stock: producto.stock || 0,
      manejaUnidad: producto.manejaUnidad || 0,
      unidad: producto.unidad || 0,
      estado: producto.estado,
    });
    this.modoFormProducto.set('editar');
  }

  guardarProducto(): void {
    if (this.formProducto.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      return;
    }

    const grupo = this.grupoSeleccionado();
    if (!grupo || !grupo.codigo) {
      this.mostrarError('No hay grupo seleccionado');
      return;
    }

    this.guardando.set(true);

    const formValues = this.formProducto.value;
    const producto: any = {
      id: formValues.id || null,
      codigo: formValues.codigo,
      codigoAux: formValues.codigoAux,
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      precioUnitario: formValues.precioUnitario || 0,
      descuento: formValues.descuento || 0,
      tipoDescuento: formValues.tipoDescuento || 0,
      incluyeIVA: formValues.incluyeIVA || 0,
      tipoIVA: formValues.tipoIVA || 0,
      tipoICE: formValues.tipoICE || 0,
      ice: formValues.ice || 0,
      subsidio: formValues.subsidio || 0,
      precioSinSub: formValues.precioSinSub || 0,
      irbpnr: formValues.irbpnr || 0,
      multiPrecio: formValues.multiPrecio || 0,
      stock: formValues.stock || 0,
      manejaUnidad: formValues.manejaUnidad || 0,
      unidad: formValues.unidad || 0,
      estado: formValues.estado,
      empresa: { codigo: this.empresa?.codigo },
      grupoProducto: { codigo: grupo.codigo },
    };

    console.log('💾 Guardando producto:', producto);

    const operacion$ = this.productoSeleccionado()
      ? this.productoService.update(producto)
      : this.productoService.add(producto);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Producto guardado correctamente');
        this.cargarProductos();
        this.cancelarProducto();
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('❌ Error al guardar producto:', err);
        this.mostrarError('Error al guardar producto');
        this.guardando.set(false);
      },
    });
  }

  eliminarProducto(producto: ProductoPago): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar el producto "${producto.nombre}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed && producto.id) {
        this.productoService.delete(producto.id).subscribe({
          next: () => {
            this.mostrarExito('Producto eliminado correctamente');
            this.cargarProductos();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar producto');
          },
        });
      }
    });
  }

  cancelarProducto(): void {
    this.productoSeleccionado.set(null);
    this.formProducto.reset({
      precioUnitario: 0,
      descuento: 0,
      tipoDescuento: 0,
      incluyeIVA: 0,
      tipoIVA: 0,
      tipoICE: 0,
      ICE: 0,
      subsidio: 0,
      precioSinSub: 0,
      IRBPNR: 0,
      multiPrecio: 0,
      stock: 0,
      manejaUnidad: 0,
      unidad: 0,
      estado: 1,
    });
    this.modoFormProducto.set('nuevo');
  }

  volverAGrupos(): void {
    this.modoVista.set('lista');
    this.grupoSeleccionado.set(null);
    this.productos.set([]);
    this.dataSourceProductos.data = [];
    this.cancelarProducto();
  }

  cancelar(): void {
    this.modoVista.set('lista');
    this.grupoSeleccionado.set(null);
    this.formGrupo.reset();
    this.planCuentaSeleccionada.set(null);
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success'],
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error'],
    });
  }

  obtenerClaseEstado(estado: number): string {
    return estado === 1 ? 'estado-activo' : 'estado-inactivo';
  }

  obtenerNombreEstado(estado: number): string {
    const opcion = this.opcionesEstado.find((o) => o.value === estado);
    return opcion?.label || 'Desconocido';
  }
}
