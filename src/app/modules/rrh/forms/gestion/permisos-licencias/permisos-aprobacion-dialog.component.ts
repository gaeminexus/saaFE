import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { PermisoLicencia } from '../../../model/permiso-licencia';
import { PermisoLicenciaService } from '../../../service/permiso-licencia.service';

export interface AprobacionDialogData {
  permiso: PermisoLicencia;
  action: 'aprobar' | 'rechazar' | 'cancelar';
}

@Component({
  selector: 'app-permisos-aprobacion-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="approval-dialog">
      <div class="dialog-header">
        <mat-icon [color]="getIconColor()">{{ getIcon() }}</mat-icon>
        <h2>{{ getTitle() }}</h2>
      </div>

      <div class="dialog-content">
        <div class="permiso-info">
          <h4>Información del Permiso</h4>
          <div class="info-row">
            <span class="label">Empleado:</span>
            <span class="value"
              >{{ data.permiso.empleado?.apellidos }} {{ data.permiso.empleado?.nombres }}</span
            >
          </div>
          <div class="info-row">
            <span class="label">Tipo:</span>
            <span class="value">{{ data.permiso.tipoPermiso?.nombre }}</span>
          </div>
          <div class="info-row">
            <span class="label">Fecha Inicio:</span>
            <span class="value">{{ data.permiso.fechaInicio | date: 'dd/MM/yyyy' }}</span>
          </div>
          @if (data.permiso.fechaFin && data.permiso.tipoPermiso?.modalidad === 'D') {
            <div class="info-row">
              <span class="label">Fecha Fin:</span>
              <span class="value">{{ data.permiso.fechaFin | date: 'dd/MM/yyyy' }}</span>
            </div>
          }
          @if (data.permiso.horaInicio && data.permiso.horaFin) {
            <div class="info-row">
              <span class="label">Horario:</span>
              <span class="value">{{ data.permiso.horaInicio }} - {{ data.permiso.horaFin }}</span>
            </div>
          }
        </div>

        @if (requiresObservation()) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ getObservationLabel() }}</mat-label>
            <textarea
              matInput
              rows="3"
              [ngModel]="observacion()"
              (ngModelChange)="observacion.set($event)"
              [required]="requiresObservation()"
              [placeholder]="getPlaceholder()"
            ></textarea>
            @if (requiresObservation() && !observacion().trim()) {
              <mat-error>{{ getObservationLabel() }} es obligatoria</mat-error>
            }
          </mat-form-field>
        }

        <div class="confirmation-text">
          <p>{{ getConfirmationText() }}</p>
        </div>
      </div>

      @if (errorMsg()) {
        <div class="error-message">
          <mat-icon color="warn">error</mat-icon>
          <span>{{ errorMsg() }}</span>
        </div>
      }

      <div class="dialog-actions">
        <button mat-stroked-button (click)="onCancel()" [disabled]="loading()">
          <mat-icon>close</mat-icon>
          Cancelar
        </button>

        <button
          mat-raised-button
          [color]="getButtonColor()"
          (click)="onConfirm()"
          [disabled]="loading() || (requiresObservation() && !observacion().trim())"
        >
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>{{ getIcon() }}</mat-icon>
          }
          {{ getActionText() }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./permisos-aprobacion-dialog.component.scss'],
})
export class PermisosAprobacionDialogComponent {
  observacion = signal<string>('');
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  constructor(
    private dialogRef: MatDialogRef<PermisosAprobacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AprobacionDialogData,
    private permisoLicenciaService: PermisoLicenciaService,
    private snackBar: MatSnackBar,
  ) {}

  getTitle(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'Aprobar Permiso';
      case 'rechazar':
        return 'Rechazar Permiso';
      case 'cancelar':
        return 'Cancelar Permiso';
      default:
        return 'Acción';
    }
  }

  getIcon(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'check_circle';
      case 'rechazar':
        return 'cancel';
      case 'cancelar':
        return 'block';
      default:
        return 'help';
    }
  }

  getIconColor(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'primary';
      case 'rechazar':
        return 'warn';
      case 'cancelar':
        return 'accent';
      default:
        return '';
    }
  }

  getButtonColor(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'primary';
      case 'rechazar':
        return 'warn';
      case 'cancelar':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getActionText(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'Aprobar';
      case 'rechazar':
        return 'Rechazar';
      case 'cancelar':
        return 'Cancelar';
      default:
        return 'Confirmar';
    }
  }

  getConfirmationText(): string {
    switch (this.data.action) {
      case 'aprobar':
        return '¿Está seguro de que desea aprobar este permiso? Una vez aprobado, no se podrá editar.';
      case 'rechazar':
        return '¿Está seguro de que desea rechazar este permiso? Debe proporcionar una observación explicando el motivo.';
      case 'cancelar':
        return '¿Está seguro de que desea cancelar este permiso? Esta acción no se puede deshacer.';
      default:
        return '';
    }
  }

  getObservationLabel(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'Observación (opcional)';
      case 'rechazar':
        return 'Motivo del rechazo';
      case 'cancelar':
        return 'Observación (opcional)';
      default:
        return 'Observación';
    }
  }

  getPlaceholder(): string {
    switch (this.data.action) {
      case 'aprobar':
        return 'Comentarios adicionales sobre la aprobación...';
      case 'rechazar':
        return 'Explique el motivo del rechazo del permiso...';
      case 'cancelar':
        return 'Motivo de la cancelación...';
      default:
        return '';
    }
  }

  requiresObservation(): boolean {
    return this.data.action === 'rechazar';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.requiresObservation() && !this.observacion().trim()) {
      this.errorMsg.set('La observación es obligatoria para rechazar un permiso');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const codigo = this.data.permiso.codigo;
    const observacion = this.observacion().trim();

    let observable;
    let successMessage: string;

    switch (this.data.action) {
      case 'aprobar':
        observable = this.permisoLicenciaService.aprobar(codigo, observacion);
        successMessage = 'Permiso aprobado exitosamente';
        break;
      case 'rechazar':
        observable = this.permisoLicenciaService.rechazar(codigo, observacion);
        successMessage = 'Permiso rechazado exitosamente';
        break;
      case 'cancelar':
        observable = this.permisoLicenciaService.cancelar(codigo);
        successMessage = 'Permiso cancelado exitosamente';
        break;
      default:
        this.loading.set(false);
        this.errorMsg.set('Acción no válida');
        return;
    }

    observable.subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result) {
          this.showSuccess(successMessage);
          this.dialogRef.close(true);
        } else {
          this.errorMsg.set('No se pudo procesar la acción');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(this.extractError(err) || `Error al ${this.data.action} el permiso`);
      },
    });
  }

  private extractError(error: any): string | null {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    return null;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }
}
