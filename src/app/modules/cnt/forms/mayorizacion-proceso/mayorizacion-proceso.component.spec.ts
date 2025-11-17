import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MayorizacionProcesoComponent } from './mayorizacion-proceso.component';
import { MayorizacionService } from '../../service/mayorizacion.service';
import { PeriodoService } from '../../service/periodo.service';

describe('MayorizacionProcesoComponent', () => {
  let component: MayorizacionProcesoComponent;
  let fixture: ComponentFixture<MayorizacionProcesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MayorizacionProcesoComponent,
        ReactiveFormsModule,
        MatSnackBarModule,
        BrowserAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        MayorizacionService,
        PeriodoService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MayorizacionProcesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.formProceso.get('empresa')?.value).toBe(1);
    expect(component.formProceso.get('proceso')?.value).toBe(1); // TipoProceso.MAYORIZACION
  });

  it('should validate required fields', () => {
    component.formProceso.patchValue({
      empresa: null,
      periodoDesde: '',
      periodoHasta: '',
      proceso: null
    });

    expect(component.formProceso.valid).toBeFalsy();
    expect(component.formProceso.get('empresa')?.hasError('required')).toBeTruthy();
    expect(component.formProceso.get('periodoDesde')?.hasError('required')).toBeTruthy();
    expect(component.formProceso.get('periodoHasta')?.hasError('required')).toBeTruthy();
    expect(component.formProceso.get('proceso')?.hasError('required')).toBeTruthy();
  });
});
