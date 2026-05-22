import { importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatCommonModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, MatDateFormats, NativeDateAdapter, DateAdapter, ErrorStateMatcher } from '@angular/material/core';
import { AbstractControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule, MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNativeDateModule } from '@angular/material/core';

export const APP_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

/**
 * ErrorStateMatcher que solo activa el estado de error cuando el campo
 * ha perdido el foco (touched), evitando errores visuales mientras el usuario escribe.
 */
export class TouchedErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: AbstractControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return !!(control?.invalid && control?.touched);
  }
}

export class EsDateAdapter extends NativeDateAdapter {
  override parse(value: string): Date | null {
    if (!value) return null;

    const trimmed = value.trim();
    const parts = trimmed.split('/');

    // Solo parsear cuando hay exactamente 3 partes con formato dd/MM/yyyy completo
    if (parts.length === 3) {
      const day   = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year  = Number(parts[2]);

      // Validar rangos básicos y que el año sea de 4 dígitos para evitar fechas 1900+x
      if (
        !isNaN(day)   && day   >= 1  && day   <= 31  &&
        !isNaN(month) && month >= 0  && month <= 11  &&
        !isNaN(year)  && year  >= 1000 && year <= 9999
      ) {
        const date = new Date(year, month, day);
        // Verificar que la fecha sea real (ej. 31/02 no se convierte en marzo)
        if (
          date.getFullYear() === year &&
          date.getMonth()    === month &&
          date.getDate()     === day
        ) {
          return date;
        }
      }
    }

    // Input parcial o inválido: retornar invalid Date para que matDatepickerParse
    // no se active (Material solo activa matDatepickerParse cuando retornamos null
    // para un input no vacío). Retornamos Invalid Date solo cuando hay texto que
    // no puede ser parseado todavía.
    // ← Para inputs parciales retornamos null (Material mostrará matDatepickerParse
    //    pero TouchedErrorStateMatcher lo ocultará hasta el blur)
    return null;
  }

  override format(date: Date, displayFormat: string): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    if (displayFormat === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    }
    if (displayFormat === 'MMM YYYY' || displayFormat === 'MMMM YYYY') {
      return date.toLocaleDateString('es-EC', { month: displayFormat.startsWith('MMMM') ? 'long' : 'short', year: 'numeric' });
    }
    return `${day}/${month}/${year}`;
  }
}

export function provideMaterial() {
  return [
    provideAnimations(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: EsDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
    { provide: ErrorStateMatcher, useClass: TouchedErrorStateMatcher },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'outline',
        floatLabel: 'always'
      }
    },
    // Configurar Material Symbols como fuente de iconos predeterminada
    {
      provide: APP_INITIALIZER,
      useFactory: (iconRegistry: MatIconRegistry) => {
        return () => {
          iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
        };
      },
      deps: [MatIconRegistry],
      multi: true
    },
    importProvidersFrom(
      MatCommonModule,
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatDatepickerModule,
      MatDialogModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatListModule,
      MatMenuModule,
      MatNativeDateModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSidenavModule,
      MatSnackBarModule,
      MatSortModule,
      MatTableModule,
      MatTabsModule,
      MatToolbarModule,
      MatTooltipModule
    )
  ];
}
