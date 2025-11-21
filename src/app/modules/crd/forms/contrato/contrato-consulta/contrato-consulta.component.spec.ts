import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratoConsultaComponent } from './contrato-consulta.component';

describe('ContratoConsultaComponent', () => {
  let component: ContratoConsultaComponent;
  let fixture: ComponentFixture<ContratoConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContratoConsultaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContratoConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
