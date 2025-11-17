import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NaturalezaCuentaComponent } from './naturaleza-cuenta.component';

describe('NaturalezaCuentaComponent', () => {
  let component: NaturalezaCuentaComponent;
  let fixture: ComponentFixture<NaturalezaCuentaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NaturalezaCuentaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NaturalezaCuentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
