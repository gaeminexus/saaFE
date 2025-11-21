import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntidadEditComponent } from './entidad-edit.component';

describe('EntidadEditComponent', () => {
  let component: EntidadEditComponent;
  let fixture: ComponentFixture<EntidadEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntidadEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntidadEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
