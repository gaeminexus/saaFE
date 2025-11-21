import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrestamoConsultaComponent } from './prestamo-consulta.component';

describe('PrestamoConsultaComponent', () => {
  let component: PrestamoConsultaComponent;
  let fixture: ComponentFixture<PrestamoConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoConsultaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrestamoConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
