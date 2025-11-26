import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AportesDashComponent } from './aportes-dash.component';

describe('AportesDashComponent', () => {
  let component: AportesDashComponent;
  let fixture: ComponentFixture<AportesDashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AportesDashComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AportesDashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
