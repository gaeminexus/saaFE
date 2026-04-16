import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleConsultaCargaComponent } from './detalle-consulta-carga.component';

describe('DetalleConsultaCargaComponent', () => {
  let component: DetalleConsultaCargaComponent;
  let fixture: ComponentFixture<DetalleConsultaCargaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleConsultaCargaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleConsultaCargaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
