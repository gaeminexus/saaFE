import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SpinnerService } from '../service/spinner.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (isLoading$ | async) {
      <div class="loading-overlay">
        <div class="loading-content">
          <mat-spinner diameter="80" [color]="'primary'"></mat-spinner>
          <div class="loading-text-container">
            <p class="loading-text">Cargando datos...</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(3px);
      animation: fadeIn 0.25s ease-in;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      padding: 3rem 4rem;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
      animation: slideUp 0.35s ease-out;
      min-width: 300px;
      border: 1px solid rgba(102, 126, 234, 0.1);
    }

    .loading-text-container {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
    }

    .loading-text {
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 1.2rem;
      font-weight: 600;
      color: #667eea;
      margin: 0;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    /* Estilos para el mat-spinner de Material */
    ::ng-deep .mat-mdc-progress-spinner {
      --mdc-circular-progress-active-indicator-color: #667eea;
    }

    ::ng-deep .mat-mdc-progress-spinner circle {
      stroke: #667eea !important;
    }
  `]
})
export class LoadingSpinnerComponent {
  private spinnerService = inject(SpinnerService);
  isLoading$ = this.spinnerService.visibility;
}
