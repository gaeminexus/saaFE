import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Componente modal que muestra advertencia de cierre de sesión
 *
 * Muestra un countdown regresivo y permite al usuario:
 * - Continuar su sesión activa
 * - Cerrar sesión voluntariamente
 * - Cierre automático si no responde
 */
@Component({
  selector: 'app-session-timeout-warning',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="warning-container">
      <div class="warning-header">
        <mat-icon class="warning-icon">schedule</mat-icon>
        <h2>Sesión por Expirar</h2>
      </div>

      <div class="warning-body">
        <p class="warning-text">Tu sesión expirará en:</p>
        <div class="timer">{{ remainingTime }}</div>
        <p class="info-text">
          Haz clic en <strong>"Continuar"</strong> para mantener tu sesión activa.
        </p>
      </div>

      <div class="button-group">
        <button mat-raised-button color="accent" (click)="continueSession()" class="continue-btn">
          <mat-icon>check_circle</mat-icon>
          Continuar
        </button>
        <button mat-stroked-button (click)="logout()" class="logout-btn">
          <mat-icon>exit_to_app</mat-icon>
          Cerrar Sesión
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .warning-container {
        padding: 2rem;
        text-align: center;
      }

      .warning-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 2rem;
      }

      .warning-icon {
        font-size: 3.5rem;
        width: 3.5rem;
        height: 3.5rem;
        color: #ff9800;
        margin-bottom: 1rem;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.7;
          transform: scale(1.1);
        }
      }

      h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #333;
        font-weight: 600;
      }

      .warning-body {
        margin: 2rem 0;
      }

      .warning-text {
        font-size: 1rem;
        color: #666;
        margin-bottom: 1rem;
      }

      .timer {
        font-size: 3rem;
        font-weight: bold;
        color: #f44336;
        margin: 1.5rem 0;
        font-family: 'Courier New', monospace;
        letter-spacing: 2px;
        text-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
      }

      .info-text {
        font-size: 0.95rem;
        color: #666;
        margin: 1.5rem 0 0 0;
        line-height: 1.5;
      }

      .button-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
        flex-wrap: wrap;
      }

      .continue-btn,
      .logout-btn {
        min-width: 140px;
        height: 48px;
        font-size: 1rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .continue-btn mat-icon,
      .logout-btn mat-icon {
        font-size: 1.2rem;
        width: 1.2rem;
        height: 1.2rem;
      }

      .continue-btn {
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
      }

      .continue-btn:hover {
        box-shadow: 0 6px 12px rgba(76, 175, 80, 0.4);
      }

      .logout-btn {
        color: #f44336;
      }

      @media (max-width: 480px) {
        .warning-container {
          padding: 1.5rem;
        }

        .timer {
          font-size: 2.5rem;
        }

        .button-group {
          flex-direction: column;
        }

        .continue-btn,
        .logout-btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class SessionTimeoutWarningComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<SessionTimeoutWarningComponent>);

  remainingTime = '2:00';
  private destroy$ = new Subject<void>();

  constructor(@Inject(MAT_DIALOG_DATA) public data: { remainingTime: number }) {}

  ngOnInit(): void {
    let seconds = this.data.remainingTime;

    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        seconds--;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.remainingTime = `${minutes}:${secs.toString().padStart(2, '0')}`;

        if (seconds <= 0) {
          this.destroy$.next();
          this.dialogRef.close('timeout');
        }
      });
  }

  /**
   * Usuario hace clic en "Continuar"
   */
  continueSession(): void {
    console.log('👤 Usuario continúa sesión activa');
    this.destroy$.next();
    this.dialogRef.close('continue');
  }

  /**
   * Usuario hace clic en "Cerrar Sesión"
   */
  logout(): void {
    console.log('🔓 Usuario cierra sesión manualmente');
    this.destroy$.next();
    this.dialogRef.close('logout');
  }

  ngOnDestroy(): void {
    this.destroy$.complete();
  }
}
