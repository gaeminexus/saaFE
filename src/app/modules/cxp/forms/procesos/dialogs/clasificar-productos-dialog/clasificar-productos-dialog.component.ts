import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { AsignacionGrupo, ProductoSinClasificar } from '../../../../model/productos-sin-clasificar';
import { CargaDocumentosService, GrupoProducto } from '../../../../service/carga-documentos.service';

export interface ClasificarProductosDialogData {
  idCargaTxt: number;
  idEmpresa: number;
}

/** true si se guardó algo: el llamador refresca el progreso de la carga. */
export type ClasificarProductosDialogResult = boolean;

/** Grupo POR CLASIFICAR: es el origen de estos productos, nunca un destino válido. */
const RUBRO_POR_CLASIFICAR = 3;

/** Producto con la asignación que el usuario está armando en pantalla. */
interface FilaProducto extends ProductoSinClasificar {
  idGrupo: number | null;
}

@Component({
  selector: 'app-clasificar-productos-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './clasificar-productos-dialog.component.html',
  styleUrl: './clasificar-productos-dialog.component.scss',
})
export class ClasificarProductosDialogComponent implements OnInit {
  private ref = inject(MatDialogRef<ClasificarProductosDialogComponent, ClasificarProductosDialogResult>);
  private processService = inject(CargaDocumentosService);
  private snackBar = inject(MatSnackBar);
  data: ClasificarProductosDialogData = inject(MAT_DIALOG_DATA);

  cargando = signal(false);
  guardando = signal(false);
  filas = signal<FilaProducto[]>([]);
  grupos = signal<GrupoProducto[]>([]);
  /** Filtro del combo de grupos: aplica a nombre y a cuenta contable (regla de combos). */
  filtroGrupo = signal('');
  noEncontrados = signal<(number | string)[]>([]);

  columnas = ['nombre', 'codigo', 'documentos', 'grupo'];

  gruposFiltrados = computed(() => {
    const texto = this.filtroGrupo().trim().toLowerCase();
    if (!texto) return this.grupos();
    return this.grupos().filter(g =>
      (g.nombre || '').toLowerCase().includes(texto) ||
      (g.planCuenta?.cuentaContable || '').toLowerCase().includes(texto));
  });

  asignados = computed(() => this.filas().filter(f => f.idGrupo != null).length);

  /** Grupos elegidos que no tienen cuenta contable: no destraban el lote. */
  asignadosSinCuenta = computed(() =>
    this.filas().filter(f => f.idGrupo != null && !this.grupo(f.idGrupo)?.planCuenta).length);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.processService.productosSinClasificarLote(this.data.idCargaTxt).subscribe({
      next: (resp) => {
        this.filas.set((resp?.productos || []).map(p => ({ ...p, idGrupo: null })));
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(`No se pudieron cargar los productos: ${this.mensajeError(err)}`, 'Cerrar',
          { duration: 6000, panelClass: ['snack-error'] });
      },
    });
    this.cargarGrupos();
  }

  /**
   * /gruposProducto devuelve la entidad completa, de TODAS las empresas y sin filtrar estado.
   * Se filtra aquí: empresa actual, activos, y fuera el propio POR CLASIFICAR — el objetivo es
   * sacar los productos de ese grupo, no volver a meterlos.
   */
  private cargarGrupos(): void {
    this.processService.getGruposProducto().subscribe({
      next: (data) => {
        const utiles = (data || [])
          .filter(g => Number(g.empresa?.codigo) === Number(this.data.idEmpresa))
          .filter(g => Number(g.estado) === 1)
          .filter(g => Number(g.rubroTipoGrupoH) !== RUBRO_POR_CLASIFICAR)
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        this.grupos.set(utiles);
      },
      error: () => {
        this.grupos.set([]);
        this.snackBar.open('No se pudieron cargar los grupos de producto', 'Cerrar',
          { duration: 6000, panelClass: ['snack-error'] });
      },
    });
  }

  grupo(codigo: number | null): GrupoProducto | undefined {
    return codigo == null ? undefined : this.grupos().find(g => Number(g.codigo) === Number(codigo));
  }

  cuentaDe(codigo: number | null): string {
    return this.grupo(codigo)?.planCuenta?.cuentaContable || '';
  }

  /** Un grupo sin cuenta contable cambia el bloqueante, no lo resuelve: se avisa, no se impide. */
  sinCuenta(codigo: number | null): boolean {
    const g = this.grupo(codigo);
    return !!g && !g.planCuenta;
  }

  asignar(fila: FilaProducto, codigoGrupo: number): void {
    this.filas.update(filas => filas.map(f => f.id === fila.id ? { ...f, idGrupo: codigoGrupo } : f));
    if (this.sinCuenta(codigoGrupo)) {
      const g = this.grupo(codigoGrupo);
      this.snackBar.open(
        `«${g?.nombre}» no tiene cuenta contable: el documento seguirá bloqueado, ahora por GRUPOS_SIN_CUENTA_CONTABLE.`,
        'Entendido', { duration: 8000, panelClass: ['warning-snackbar'] });
    }
  }

  limpiarFiltro(): void { this.filtroGrupo.set(''); }

  /** El panel del select comparte el filtro: se limpia al cerrarlo para no confundir la siguiente fila. */
  onPanelGrupos(abierto: boolean): void {
    if (!abierto) { this.limpiarFiltro(); }
  }

  aplicarFiltro(valor: string): void { this.filtroGrupo.set(valor); }

  guardar(): void {
    const asignaciones: AsignacionGrupo[] = this.filas()
      .filter(f => f.idGrupo != null)
      .map(f => ({ idProducto: f.id, idGrupo: f.idGrupo as number }));
    if (asignaciones.length === 0) { return; }

    this.guardando.set(true);
    this.noEncontrados.set([]);
    this.processService.clasificarProductosLote({ idEmpresa: this.data.idEmpresa, asignaciones }).subscribe({
      next: (resp) => {
        this.guardando.set(false);
        const actualizados = resp?.actualizados ?? 0;
        const faltantes = resp?.noEncontrados || [];
        this.noEncontrados.set(faltantes);
        this.snackBar.open(`${actualizados} producto(s) clasificado(s).`, 'Cerrar',
          { duration: 5000, panelClass: ['snack-success'] });
        // Con productos sin encontrar el diálogo queda abierto para que el usuario los vea;
        // se recarga la lista para reflejar lo que sí se guardó.
        if (faltantes.length > 0) { this.cargar(); return; }
        this.ref.close(true);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(`No se pudo clasificar: ${this.mensajeError(err)}`, 'Cerrar',
          { duration: 7000, panelClass: ['snack-error'] });
      },
    });
  }

  cerrar(): void { this.ref.close(this.noEncontrados().length > 0); }

  private mensajeError(err: any): string {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    return err?.mensaje || err?.message || err?.error || 'Error desconocido';
  }
}
