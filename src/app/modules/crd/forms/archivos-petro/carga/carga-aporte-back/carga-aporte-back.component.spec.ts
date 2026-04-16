import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargaAporteBackComponent } from './carga-aporte-back.component';

describe('CargaAporteBackComponent', () => {
  let component: CargaAporteBackComponent;
  let fixture: ComponentFixture<CargaAporteBackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaAporteBackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargaAporteBackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
