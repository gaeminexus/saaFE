import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CentroCostoService } from '../../service/centro-costo.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { DetalleAsientoComponent } from './detalle-asiento.component';

describe('DetalleAsientoComponent', () => {
  let component: DetalleAsientoComponent;
  let fixture: ComponentFixture<DetalleAsientoComponent>;
  let planCuentaService: jasmine.SpyObj<PlanCuentaService>;
  let centroCostoService: jasmine.SpyObj<CentroCostoService>;

  beforeEach(async () => {
    const planCuentaSpy = jasmine.createSpyObj('PlanCuentaService', ['getAll']);
    const centroCostoSpy = jasmine.createSpyObj('CentroCostoService', ['getAll']);

    // Mock services to return empty arrays
    planCuentaSpy.getAll.and.returnValue(of([]));
    centroCostoSpy.getAll.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        DetalleAsientoComponent,
        ReactiveFormsModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatToolbarModule,
        MatProgressSpinnerModule,
        BrowserAnimationsModule,
      ],
      providers: [
        FormBuilder,
        { provide: PlanCuentaService, useValue: planCuentaSpy },
        { provide: CentroCostoService, useValue: centroCostoSpy },
      ],
    }).compileComponents();

    planCuentaService = TestBed.inject(PlanCuentaService) as jasmine.SpyObj<PlanCuentaService>;
    centroCostoService = TestBed.inject(CentroCostoService) as jasmine.SpyObj<CentroCostoService>;

    fixture = TestBed.createComponent(DetalleAsientoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty detalles array initially', () => {
    expect(component.detalles.length).toBe(0);
  });

  it('should display empty totals initially', () => {
    expect(component.totalDebe).toBe(0);
    expect(component.totalHaber).toBe(0);
    expect(component.diferencia).toBe(0);
  });

  it('should have form with required fields', () => {
    fixture.detectChanges();
    const planCuentaControl = component.formDetalle.get('planCuenta');
    const descripcionControl = component.formDetalle.get('descripcion');
    const valorDebeControl = component.formDetalle.get('valorDebe');
    const valorHaberControl = component.formDetalle.get('valorHaber');

    expect(planCuentaControl?.hasError('required')).toBe(true);
    expect(descripcionControl?.hasError('required')).toBe(true);
    expect(valorDebeControl?.hasError('required')).toBe(true);
    expect(valorHaberControl?.hasError('required')).toBe(true);
  });

  it('should not add detalle if form is invalid', () => {
    fixture.detectChanges();
    const initialLength = component.detalles.length;
    component.onInsertar();
    expect(component.detalles.length).toBe(initialLength);
  });

  it('should display correct displayedColumns', () => {
    expect(component.displayedColumns.length).toBe(6);
    expect(component.displayedColumns).toContain('cuenta');
    expect(component.displayedColumns).toContain('detalle');
    expect(component.displayedColumns).toContain('debe');
    expect(component.displayedColumns).toContain('haber');
    expect(component.displayedColumns).toContain('centroCostos');
    expect(component.displayedColumns).toContain('acciones');
  });

  it('should cancel editing without saving', () => {
    fixture.detectChanges();
    component.editingIndex = 0;
    component.onCancelar();
    expect(component.editingIndex).toBeNull();
  });

  it('should emit detallesChanged event', (done) => {
    component.detallesChanged.subscribe((detalles) => {
      expect(detalles).toEqual([]);
      done();
    });

    component.emitDetallesChanged();
  });

  it('should update dataSource when detalles change', () => {
    fixture.detectChanges();
    component.dataSource.data = [];
    expect(component.dataSource.data.length).toBe(0);
  });

  it('should load plan cuentas and centros costo on init', () => {
    fixture.detectChanges();
    component.ngOnInit();

    expect(planCuentaService.getAll).toHaveBeenCalled();
    expect(centroCostoService.getAll).toHaveBeenCalled();
  });
});
