import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ValidatorFn, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FieldConfig } from '../../model/field.interface';
import { DynamicFieldDirective } from '../dynamic-field/dynamic-field.directive';
import { MaterialFormModule } from '../../../../../modules/material-form.module';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialFormModule,
    DynamicFieldDirective
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss'
})
export class DynamicFormComponent implements OnInit {

  @Input() fields: FieldConfig[] = [];
  @Input()
  accion!: number;

  // tslint:disable-next-line: no-output-native
  @Output() submit: EventEmitter<any> = new EventEmitter<any>();

  form!: FormGroup;

  get value() {
    return this.form.value;
  }

  get control(): FormGroup {
    return this.form;
  }

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.createControl();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.form.valid) {
      this.submit.emit(this.form.value);
    } else {
      this.validateAllFormFields(this.form);
    }
  }

  private createControl(): FormGroup {
    const group = this.fb.group({});
    this.fields.forEach(field => {
      if (field.type === 'button') { return; }
      const control = this.fb.control(
        field.value ?? null,
        this.bindValidations(field.validations || [])
      );
      group.addControl(field.name, control);
    });
    return group;
  }

  private bindValidations(validations: { validator: ValidatorFn }[]): ValidatorFn | null {
    if (validations.length > 0) {
      const validList = validations.map(valid => valid.validator);
      return Validators.compose(validList);
    }
    return null;
  }

  validateAllFormFields(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
        if (control instanceof FormGroup) {
          this.validateAllFormFields(control);
        }
      }
    });
  }

}

