import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-entidad-creditos',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="entidad-creditos-container">
      <div class="header">
        <h2>
          <mat-icon>business</mat-icon>
          Gestión de Entidades de Crédito
        </h2>
        <p class="subtitle">Administra las entidades y sus productos crediticios</p>
      </div>

      <div class="opciones-grid">
        <mat-card class="opcion-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>account_tree</mat-icon>
            <mat-card-title>Navegación en Cascada</mat-card-title>
            <mat-card-subtitle>Explora entidades → productos → préstamos → pagos</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Navega de forma jerárquica a través de la información de entidades,
            sus productos crediticios, préstamos asociados y el detalle de pagos.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-raised-button color="primary" routerLink="/menucreditos/navegacion-cascada">
              <mat-icon>launch</mat-icon>
              Acceder
            </button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="opcion-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>Gestión de Entidades</mat-card-title>
            <mat-card-subtitle>Administración completa de entidades</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Crear, modificar y eliminar entidades. Configurar datos básicos,
            contacto y parámetros de crédito específicos por entidad.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-raised-button color="accent" disabled>
              <mat-icon>build</mat-icon>
              Próximamente
            </button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="opcion-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>analytics</mat-icon>
            <mat-card-title>Reportes de Entidades</mat-card-title>
            <mat-card-subtitle>Informes y análisis de cartera</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Genera reportes detallados de la cartera de créditos por entidad,
            análisis de riesgo y estados de cuenta consolidados.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-raised-button color="accent" disabled>
              <mat-icon>build</mat-icon>
              Próximamente
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .entidad-creditos-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }

    .header h2 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 0 0 8px 0;
      color: #1976d2;
      font-size: 1.75rem;
    }

    .subtitle {
      color: #666;
      font-size: 1.1rem;
      margin: 0;
    }

    .opciones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    .opcion-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }

    .opcion-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }

    .opcion-card mat-card-content {
      flex: 1;
    }

    .opcion-card mat-card-actions {
      padding: 16px;
    }

    .opcion-card [mat-card-avatar] {
      color: #1976d2;
      background-color: #e3f2fd;
    }

    .opcion-card mat-card-title {
      color: #1976d2;
      font-weight: 600;
    }

    .opcion-card mat-card-subtitle {
      color: #666;
      margin-bottom: 8px;
    }

    .opcion-card p {
      color: #555;
      line-height: 1.5;
      margin: 0;
    }

    @media (max-width: 768px) {
      .entidad-creditos-container {
        padding: 16px;
      }

      .opciones-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  `]
})
export class EntidadCreditosComponent {}
