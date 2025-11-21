import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratoDashComponent } from './contrato-dash.component';

describe('ContratoDashComponent', () => {
  let component: ContratoDashComponent;
  let fixture: ComponentFixture<ContratoDashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContratoDashComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContratoDashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
