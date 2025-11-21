import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadosCrdComponent } from './estados-crd.component';

describe('EstadosCrdComponent', () => {
  let component: EstadosCrdComponent;
  let fixture: ComponentFixture<EstadosCrdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstadosCrdComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstadosCrdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
