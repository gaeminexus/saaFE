import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { UsuarioService } from '../../../../../shared/services/usuario.service';

export interface CambioClaveData {
  idUsuario: string;
  esDesdeLogin: boolean; // true: desde login, false: desde header
}

@Component({
  selector: 'app-cambio-clave-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './cambio-clave-dialog.component.html',
  styleUrls: ['./cambio-clave-dialog.component.scss'],
})
export class CambioClaveDialogComponent implements OnInit {
  claveForm!: FormGroup;
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  hideClaveActual = signal<boolean>(true);
  hideClaveNueva = signal<boolean>(true);
  hideClaveConfirmar = signal<boolean>(true);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CambioClaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CambioClaveData,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.claveForm = this.fb.group(
      {
        claveActual: ['', [Validators.required]],
        claveNueva: ['', [Validators.required]],
        claveConfirmar: ['', [Validators.required]],
      },
      {
        validators: [this.passwordsMatchValidator(), this.passwordsDifferentValidator()],
      }
    );
  }

  // Validador personalizado: las contraseñas deben coincidir
  private passwordsMatchValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const nueva = control.get('claveNueva')?.value;
      const confirmar = control.get('claveConfirmar')?.value;

      if (!nueva || !confirmar) {
        return null;
      }

      return nueva === confirmar ? null : { passwordsMismatch: true };
    };
  }

  // Validador personalizado: la nueva contraseña debe ser diferente a la actual
  private passwordsDifferentValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const actual = control.get('claveActual')?.value;
      const nueva = control.get('claveNueva')?.value;

      if (!actual || !nueva) {
        return null;
      }

      return actual !== nueva ? null : { passwordsSame: true };
    };
  }

  get claveActualControl() {
    return this.claveForm.get('claveActual');
  }

  get claveNuevaControl() {
    return this.claveForm.get('claveNueva');
  }

  get claveConfirmarControl() {
    return this.claveForm.get('claveConfirmar');
  }

  get passwordsMismatch(): boolean {
    return (
      (this.claveForm.hasError('passwordsMismatch') && this.claveConfirmarControl?.touched) || false
    );
  }

  get passwordsSame(): boolean {
    return (this.claveForm.hasError('passwordsSame') && this.claveNuevaControl?.touched) || false;
  }

  onCambiarClave(): void {
    if (this.claveForm.invalid) {
      this.claveForm.markAllAsTouched();
      return;
    }

    const { claveActual, claveNueva } = this.claveForm.value;

    this.loading.set(true);
    this.errorMsg.set('');

    this.usuarioService.cambiaClave(this.data.idUsuario, claveActual, claveNueva).subscribe({
      next: (response: string) => {
        this.loading.set(false);

        if (
          response === 'OK' ||
          response.includes('exitosa') ||
          response.includes('correctamente')
        ) {
          this.snackBar.open('Contraseña cambiada exitosamente', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar'],
          });
          this.dialogRef.close({ success: true });
        } else {
          this.errorMsg.set(response || 'Error al cambiar la contraseña');
        }
      },
      error: (error: any) => {
        this.loading.set(false);
        const errorMessage =
          error.error?.message ||
          error.message ||
          'Error al cambiar la contraseña. Verifique que la contraseña actual sea correcta.';
        this.errorMsg.set(errorMessage);
        console.error('Error al cambiar contraseña:', error);
      },
    });
  }

  onCancelar(): void {
    this.dialogRef.close({ success: false });
  }
}
