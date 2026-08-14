import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';
import { PrestamoPagosDialogComponent, PrestamoPagosDialogData } from './prestamo-pagos-dialog.component';

/** Cuota mínima: solo los campos que lee el diálogo. */
const detalle = {
  codigo: 1,
  numeroCuota: 3,
  fechaVencimiento: new Date('2026-03-15'),
  capital: 100,
  interes: 10,
  mora: 0,
  interesVencido: 0,
  saldoCapital: 0,
  saldoInteres: 0,
  saldoMora: 0,
  saldoInteresVencido: 0,
  desgravamen: 2,
  cuota: 112,
  total: 112,
  saldo: 0,
  saldoOtros: 0,
  estado: 4,
  diasMora: 0,
} as unknown as DetallePrestamo;

const pagos = [
  {
    codigo: 55,
    fecha: new Date('2026-03-14'),
    valor: 112,
    numeroCuota: 3,
    capitalPagado: 100,
    interesPagado: 10,
    moraPagada: 0,
    interesVencidoPagado: 0,
    desgravamen: 2,
    saldoOtros: 0,
    observacion: 'Transferencia bancaria',
    usuarioRegistro: 'jperez',
  } as unknown as PagoPrestamo,
];

describe('PrestamoPagosDialogComponent', () => {
  let component: PrestamoPagosDialogComponent;
  let fixture: ComponentFixture<PrestamoPagosDialogComponent>;

  beforeEach(async () => {
    const data: PrestamoPagosDialogData = { detalle, pagos, esPrestamoConSeguro: false };

    await TestBed.configureTestingModule({
      imports: [PrestamoPagosDialogComponent, NoopAnimationsModule],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: data }],
    }).compileComponents();

    fixture = TestBed.createComponent(PrestamoPagosDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('suma los pagos y calcula el avance de la cuota', () => {
    expect(component.totalPagado).toBe(112);
    expect(component.saldoPendiente).toBe(0);
    expect(component.porcentajePagado).toBe(100);
    expect(component.cuotaSaldada).toBeTrue();
  });

  it('desglosa el pago solo con los conceptos que tuvieron valor', () => {
    const [primero] = component.pagosOrdenados;
    expect(primero.conceptos.map((c) => c.nombre)).toEqual(['Desgravamen', 'Interés', 'Capital']);
    expect(primero.descuadre).toBe(0);
  });
});
