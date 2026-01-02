import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuotaConsultaComponent } from './cuota-consulta.component';

describe('CuotaConsultaComponent', () => {
  let component: CuotaConsultaComponent;
  let fixture: ComponentFixture<CuotaConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuotaConsultaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CuotaConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
