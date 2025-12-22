import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AportesPorRevisarComponent } from './aportes-por-revisar.component';

describe('AportesPorRevisarComponent', () => {
  let component: AportesPorRevisarComponent;
  let fixture: ComponentFixture<AportesPorRevisarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AportesPorRevisarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AportesPorRevisarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
