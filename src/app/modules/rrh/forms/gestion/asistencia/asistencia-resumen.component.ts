import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Asistencia, ResumenAsistencia, TipoRegistroAsistencia } from '../../../model/asistencia';

@Component({
  selector: 'app-asistencia-resumen',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="resumen-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>assessment</mat-icon>
            Resumen de Asistencia
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="resumen-grid">
            <!-- Asistencias -->
            <div class="resumen-item success">
              <div class="resumen-icon">
                <mat-icon>check_circle</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalAsistencias }}</div>
                <div class="resumen-label">Asistencias</div>
              </div>
            </div>

            <!-- Faltas -->
            <div class="resumen-item error">
              <div class="resumen-icon">
                <mat-icon>cancel</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalFaltas }}</div>
                <div class="resumen-label">Faltas</div>
              </div>
            </div>

            <!-- Atrasos -->
            <div class="resumen-item warning">
              <div class="resumen-icon">
                <mat-icon>schedule</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalAtrasos }}</div>
                <div class="resumen-label">Tardanzas</div>
              </div>
            </div>

            <!-- Minutos de atraso -->
            <div class="resumen-item warning">
              <div class="resumen-icon">
                <mat-icon>timer</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalMinutosAtraso }}</div>
                <div class="resumen-label">Minutos Atraso</div>
              </div>
            </div>

            <!-- Permisos -->
            <div class="resumen-item info">
              <div class="resumen-icon">
                <mat-icon>event_note</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalPermisos }}</div>
                <div class="resumen-label">Permisos</div>
              </div>
            </div>

            <!-- Vacaciones -->
            <div class="resumen-item info">
              <div class="resumen-icon">
                <mat-icon>beach_access</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalVacaciones }}</div>
                <div class="resumen-label">Vacaciones</div>
              </div>
            </div>

            <!-- Licencias -->
            <div class="resumen-item info">
              <div class="resumen-icon">
                <mat-icon>description</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ resumen().totalLicencias }}</div>
                <div class="resumen-label">Licencias</div>
              </div>
            </div>

            <!-- Porcentaje de asistencia -->
            <div class="resumen-item primary">
              <div class="resumen-icon">
                <mat-icon>percent</mat-icon>
              </div>
              <div class="resumen-data">
                <div class="resumen-value">{{ porcentajeAsistencia() }}%</div>
                <div class="resumen-label">% Asistencia</div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .resumen-container {
        margin-bottom: 20px;
      }

      .resumen-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .resumen-item {
        display: flex;
        align-items: center;
        padding: 16px;
        border-radius: 8px;
        background: #f5f5f5;
        border-left: 4px solid #ccc;
      }

      .resumen-item.success {
        border-left-color: #4caf50;
        background: #e8f5e9;
      }

      .resumen-item.error {
        border-left-color: #f44336;
        background: #ffebee;
      }

      .resumen-item.warning {
        border-left-color: #ff9800;
        background: #fff3e0;
      }

      .resumen-item.info {
        border-left-color: #2196f3;
        background: #e3f2fd;
      }

      .resumen-item.primary {
        border-left-color: #9c27b0;
        background: #f3e5f5;
      }

      .resumen-icon {
        margin-right: 12px;
      }

      .resumen-icon mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        opacity: 0.7;
      }

      .resumen-data {
        flex: 1;
      }

      .resumen-value {
        font-size: 24px;
        font-weight: 600;
        line-height: 1;
        margin-bottom: 4px;
      }

      .resumen-label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
      }
    `,
  ],
})
export class AsistenciaResumenComponent {
  // Input de datos
  registros = input<Asistencia[]>([]);

  // Resumen calculado
  resumen = computed(() => {
    const data = this.registros();
    const resumen: ResumenAsistencia = {
      totalAsistencias: 0,
      totalFaltas: 0,
      totalAtrasos: 0,
      totalMinutosAtraso: 0,
      totalPermisos: 0,
      totalVacaciones: 0,
      totalLicencias: 0,
    };

    data.forEach((registro) => {
      switch (registro.tipoRegistro) {
        case TipoRegistroAsistencia.MARCACION:
          resumen.totalAsistencias++;
          if (registro.minutosAtraso && registro.minutosAtraso > 0) {
            resumen.totalAtrasos++;
            resumen.totalMinutosAtraso += registro.minutosAtraso;
          }
          break;
        case TipoRegistroAsistencia.FALTA:
          resumen.totalFaltas++;
          break;
        case TipoRegistroAsistencia.TARDANZA:
          resumen.totalAtrasos++;
          if (registro.minutosAtraso) {
            resumen.totalMinutosAtraso += registro.minutosAtraso;
          }
          break;
        case TipoRegistroAsistencia.PERMISO:
          resumen.totalPermisos++;
          break;
        case TipoRegistroAsistencia.VACACION:
          resumen.totalVacaciones++;
          break;
        case TipoRegistroAsistencia.LICENCIA:
          resumen.totalLicencias++;
          break;
      }
    });

    return resumen;
  });

  // Porcentaje de asistencia
  porcentajeAsistencia = computed(() => {
    const r = this.resumen();
    const total = r.totalAsistencias + r.totalFaltas + r.totalAtrasos;
    if (total === 0) return 0;
    return Math.round(((r.totalAsistencias + r.totalAtrasos) / total) * 100);
  });
}
