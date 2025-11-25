import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { NestedTreeControl } from '@angular/cdk/tree';
import { ReactiveFormsModule } from '@angular/forms';

import { CentroCosto } from '../../model/centro-costo';
import { CentroCostoService } from '../../service/centro-costo.service';
import { CentroCostoUtilsService } from '../../../../shared/services/centro-costo-utils.service';
import { CentroArbolFormComponent } from './centro-arbol-form.component';


interface CentroCostoNode extends CentroCosto {
  children?: CentroCostoNode[];
  level?: number;
  expandable?: boolean;
  isExpanded?: boolean;
  codigoStr?: string; // código jerárquico virtual
}

@Component({
  selector: 'app-centro-arbol',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './centro-arbol.component.html',
  styleUrls: ['./centro-arbol.component.scss']
})
export class CentroArbolComponent implements OnInit {
  // Datos base
  centros: CentroCosto[] = [];
  treeData: CentroCostoNode[] = [];
  loading = false;
  error: string | null = null;

  // Control árbol anidado
  treeControl = new NestedTreeControl<CentroCostoNode>((node: CentroCostoNode) => node.children);
  dataSource = new MatTreeNestedDataSource<CentroCostoNode>();

  // Nodo seleccionado y preview del próximo código
  selectedNode: CentroCostoNode | null = null;
  previewCodigoDestino = '';

  constructor(
    private centroCostoService: CentroCostoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private centroUtils: CentroCostoUtilsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    console.log('[CentroArbolComponent] Cargando centros (getAll + filtro empresa 280)...');
    this.centroCostoService.getAll().subscribe(
      (centros: CentroCosto[] | null) => {
        const lista = centros || [];
        const filtrados = lista.filter(c => c.empresa?.codigo === 280);
        console.log(`[CentroArbolComponent] Total: ${lista.length} | Empresa 280: ${filtrados.length}`);
        
        this.centros = filtrados;
        this.buildTree();
        this.updatePreviewCodigoDestino();
        this.loading = false;
      },
      (err: any) => {
        console.error('[CentroArbolComponent] Error cargando centros:', err);
        this.error = 'Error al cargar los centros de costo desde el backend';
        this.centros = [];
        this.loading = false;
      }
    );
  }

  private buildTree(): void {
    // Construir jerarquía a partir de centros planos (el servicio ya entrega jerarquía pero homogenizamos)
    const map = new Map<number, CentroCostoNode>();
    this.centros.forEach(c => {
      map.set(c.codigo, { ...c, children: [], level: c.nivel, expandable: false, isExpanded: false, codigoStr: '' });
    });

    const roots: CentroCostoNode[] = [];
    this.centros.forEach(c => {
      const node = map.get(c.codigo)!;
      if (c.idPadre && map.has(c.idPadre)) {
        const parent = map.get(c.idPadre)!;
        parent.children!.push(node);
        parent.expandable = true;
        node.codigoStr = parent.codigoStr ? `${parent.codigoStr}.${node.numero}` : `${parent.numero}.${node.numero}`;
      } else {
        node.codigoStr = String(node.numero);
        roots.push(node);
      }
    });

    // Orden jerárquico por código
    const sortNodes = (nodes: CentroCostoNode[]) => {
      nodes.sort((a,b) => this.centroUtils.sortCodigos(a.codigoStr || '', b.codigoStr || ''));
      nodes.forEach(n => n.children && n.children.length > 0 && sortNodes(n.children));
    };
    sortNodes(roots);
    this.treeData = roots;
    this.dataSource.data = this.treeData;
    console.log('[CentroArbolComponent] Árbol construido:', { roots: roots.length, total: this.centros.length });
  }

  // ---- Numeración y helpers delegados a utils ----
  private getMaxDepthAllowed(): number {
    const existingMax = Math.max(0, ...this.centros.map(c => c.nivel || 0));
    return this.centroUtils.getMaxDepthAllowed(existingMax);
  }

  private generateNuevoCodigo(parent?: CentroCostoNode): string {
    const existingCodigos = this.centros
      .map(c => this.buildCodigoStrForCentro(c))
      .filter(c => c);
    
    return this.centroUtils.generateNuevoCodigo(
      parent?.codigoStr || null,
      existingCodigos
    );
  }

  private buildCodigoStrForCentro(centro: CentroCosto): string {
    // Reconstruir código jerárquico desde el centro
    if (!centro.idPadre) {
      return String(centro.numero);
    }
    const parent = this.centros.find(c => c.codigo === centro.idPadre);
    if (!parent) {
      return String(centro.numero);
    }
    const parentCodigo = this.buildCodigoStrForCentro(parent);
    return `${parentCodigo}.${centro.numero}`;
  }

  private updatePreviewCodigoDestino(): void {
    if (this.selectedNode) {
      this.previewCodigoDestino = this.generateNuevoCodigo(this.selectedNode);
    } else {
      this.previewCodigoDestino = this.generateNuevoCodigo();
    }
  }

  // Tree helper
  hasChild = (_: number, node: CentroCostoNode) => !!node.children && node.children.length > 0;

  // Selección de nodo
  selectNode(node: CentroCostoNode): void {
    this.selectedNode = node;
    this.updatePreviewCodigoDestino();
  }

  // CRUD Operations
  onAdd(parent?: CentroCostoNode): void {
    if (!parent && this.selectedNode) {
      parent = this.selectedNode;
    }
    if (parent && parent.level && parent.level >= this.getMaxDepthAllowed()) {
      alert('Profundidad máxima alcanzada.');
      return;
    }

    const presetCodigo = this.generateNuevoCodigo(parent);
    const presetNivel = parent ? (parent.nivel || parent.level || 1) + 1 : 1;

    const presetNumeroValue = parseInt(presetCodigo, 10) || 0;
    const dialogRef = this.dialog.open(CentroArbolFormComponent, {
      width: '650px',
      disableClose: true,
      data: {
        item: null,
        parent: parent ? this.findCentroCostoByNode(parent) : null,
        presetNumero: presetNumeroValue,
        presetNivel,
        maxDepth: this.getMaxDepthAllowed()
      }
    });
    dialogRef.afterClosed().subscribe(result => { if (result) { this.loadData(); } });
  }

  onEdit(node: CentroCostoNode): void {
    const centroCosto = this.findCentroCostoByNode(node);
    if (!centroCosto) return;
    const dialogRef = this.dialog.open(CentroArbolFormComponent, {
      width: '650px',
      disableClose: true,
      data: { item: centroCosto, parent: null }
    });
    dialogRef.afterClosed().subscribe(result => { if (result) { this.loadData(); } });
  }

  onDelete(node: CentroCostoNode): void {
    // Validar que el nodo tenga un código válido del backend
    if (!node.codigo || node.codigo === 0) {
      this.snackBar.open('No se puede eliminar un centro sin código válido', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (confirm('¿Está seguro de eliminar este centro de costo?')) {
      this.centroCostoService.delete(node.codigo).subscribe({
        next: (success) => {
          if (success) {
            this.loadData();
            this.snackBar.open('Centro de costo eliminado', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          }
        },
        error: (error) => {
          console.error('Error deleting centro:', error);
          this.snackBar.open('Error al eliminar el centro de costo', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  private findCentroCostoByNode(node: CentroCostoNode): CentroCosto | null {
    return this.centros.find(c => c.codigo === node.codigo) || null;
  }

  // Utility methods delegados a utils
  getTipoLabel(tipo: number): string {
    return this.centroUtils.getTipoLabel(tipo);
  }

  getTipoClass(tipo: number): string {
    return this.centroUtils.getTipoClass(tipo);
  }

  getEstadoLabel(estado: number): string {
    return this.centroUtils.getEstadoLabel(estado);
  }

  formatDate(date?: Date): string {
    return this.centroUtils.formatFecha(date);
  }

  // Actions
  refreshData(): void { this.loadData(); }
  expandAll(): void { this.treeControl.expandAll(); }
  collapseAll(): void { this.treeControl.collapseAll(); }
}
