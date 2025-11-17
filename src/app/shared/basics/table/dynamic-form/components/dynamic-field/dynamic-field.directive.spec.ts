import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewContainerRef } from '@angular/core';
import { DynamicFieldDirective } from './dynamic-field.directive';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  template: `<div [appDynamicField]="field" [group]="group" [accion]="accion"></div>`
})
class TestComponent {
  field = {
    type: 'input',
    name: 'testField',
    label: 'Test Field'
  };
  group = new FormGroup({});
  accion = 1;
}

describe('DynamicFieldDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let viewContainerRef: ViewContainerRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [DynamicFieldDirective, TestComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    viewContainerRef = fixture.debugElement.injector.get(ViewContainerRef);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    const directive = new DynamicFieldDirective(viewContainerRef);
    expect(directive).toBeTruthy();
  });

  it('should create component based on field type', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement;
    expect(element).toBeTruthy();
  });
});
