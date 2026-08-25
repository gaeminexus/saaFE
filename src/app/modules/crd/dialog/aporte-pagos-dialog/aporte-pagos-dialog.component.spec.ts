import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { Aporte } from '../../model/aporte';
import { PagoAporte } from '../../model/pago-aporte';
import { PagoAporteService } from '../../service/pago-aporte.service';
import { AportePagosDialogComponent, AportePagosDialogData } from './aporte-pagos-dialog.component';

/** Aporte mínimo: solo los campos que lee el diálogo. */
const aporte = {
  codigo: 77,
  fechaTransaccion: new Date('2026-05-31'),
  glosa: 'Aporte mensual mayo',
  valor: 150,
  valorPagado: 100,
  saldo: 50,
  estado: 1,
} as unknown as Aporte;

/** Dos pagos vigentes y uno anulado, que no debe sumar. */
const pagos = [
  { codigo: 1, valor: 60, fechaContable: '2026-05-31', concepto: 'Descuento nómina', estado: 1 },
  { codigo: 2, valor: 40, fechaContable: '2026-06-15', concepto: 'Depósito', estado: 1 },
  { codigo: 3, valor: 25, fechaContable: '2026-06-20', concepto: 'Reverso', estado: 0 },
] as unknown as PagoAporte[];

describe('AportePagosDialogComponent', () => {
  let component: AportePagosDialogComponent;
  let fixture: ComponentFixture<AportePagosDialogComponent>;

  beforeEach(async () => {
    const data: AportePagosDialogData = { aporte, tipoAporte: 'Aporte Personal' };

    await TestBed.configureTestingModule({
      imports: [AportePagosDialogComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: PagoAporteService, useValue: { selectByCriteria: () => of(pagos) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AportePagosDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga los pagos del aporte y marca los anulados', () => {
    expect(component.pagos.length).toBe(3);
    expect(component.pagosVigentes).toBe(2);
    expect(component.pagos[2].vigente).toBeFalse();
  });

  it('suma solo los pagos vigentes y detecta el descuadre con el aporte', () => {
    expect(component.totalPagado).toBe(100);
    expect(component.totalAnulado).toBe(25);
    expect(component.descuadre).toBe(0);
  });
});
