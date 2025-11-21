import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrestamoDashComponent } from './prestamo-dash.component';

describe('PrestamoDashComponent', () => {
  let component: PrestamoDashComponent;
  let fixture: ComponentFixture<PrestamoDashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoDashComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrestamoDashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
