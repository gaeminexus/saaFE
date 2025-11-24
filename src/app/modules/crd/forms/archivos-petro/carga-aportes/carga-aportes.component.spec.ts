import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargaAportesComponent } from './carga-aportes.component';

describe('CargaAportesComponent', () => {
  let component: CargaAportesComponent;
  let fixture: ComponentFixture<CargaAportesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaAportesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargaAportesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
