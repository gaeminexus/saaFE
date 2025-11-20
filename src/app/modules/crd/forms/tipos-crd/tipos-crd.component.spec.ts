import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiposCrdComponent } from './tipos-crd.component';

describe('TiposCrdComponent', () => {
  let component: TiposCrdComponent;
  let fixture: ComponentFixture<TiposCrdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiposCrdComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiposCrdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
