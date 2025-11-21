import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadosCrdComponent } from './listados-crd.component';

describe('ListadosCrdComponent', () => {
  let component: ListadosCrdComponent;
  let fixture: ComponentFixture<ListadosCrdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadosCrdComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadosCrdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
