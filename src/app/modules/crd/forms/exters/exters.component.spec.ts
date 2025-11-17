import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExtersComponent } from './exters.component';

describe('ExtersComponent', () => {
  let component: ExtersComponent;
  let fixture: ComponentFixture<ExtersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ExtersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
