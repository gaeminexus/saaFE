import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsientosContablesComponent } from './asientos-contables.component';

describe('AsientosContablesComponent', () => {
  let component: AsientosContablesComponent;
  let fixture: ComponentFixture<AsientosContablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsientosContablesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AsientosContablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.form).toBeDefined();
    expect(component.form.get('tipo')?.value).toBe('');
    expect(component.form.get('moduloOrigen')?.value).toBe('');
  });

  it('should calculate totals correctly', () => {
    component.totalDebe = 100;
    component.totalHaber = 80;
    component.diferencia = 20;

    expect(component.totalDebe).toBe(100);
    expect(component.totalHaber).toBe(80);
    expect(component.diferencia).toBe(20);
  });

  it('should disable submit button when form is invalid', () => {
    component.form.reset();
    expect(component.form.invalid).toBeTruthy();
  });

  it('should clear form on cancel', () => {
    component.form.patchValue({
      tipo: 1,
      moduloOrigen: 1,
      observaciones: 'Test',
    });

    component.onCancelar();

    expect(component.form.get('tipo')?.value).toBeNull();
    expect(component.totalDebe).toBe(0);
    expect(component.totalHaber).toBe(0);
  });
});
