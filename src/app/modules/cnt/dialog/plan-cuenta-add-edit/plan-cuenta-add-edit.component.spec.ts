import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanCuentaAddEditComponent } from './plan-cuenta-add-edit.component';

describe('PlanCuentaAddEditComponent', () => {
  let component: PlanCuentaAddEditComponent;
  let fixture: ComponentFixture<PlanCuentaAddEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanCuentaAddEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanCuentaAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
