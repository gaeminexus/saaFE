import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoProductosComponent } from './grupo-productos.component';

describe('GrupoProductosComponent', () => {
  let component: GrupoProductosComponent;
  let fixture: ComponentFixture<GrupoProductosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrupoProductosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrupoProductosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
