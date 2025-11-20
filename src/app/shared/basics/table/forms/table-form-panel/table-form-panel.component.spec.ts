import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableFormPanelComponent } from './table-form-panel.component';

describe('TableFormPanelComponent', () => {
  let component: TableFormPanelComponent;
  let fixture: ComponentFixture<TableFormPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableFormPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableFormPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
