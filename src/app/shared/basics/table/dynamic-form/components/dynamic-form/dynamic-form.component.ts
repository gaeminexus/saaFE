import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { FieldConfig } from '../../model/field.interface';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { ButtonComponent } from '../button/button.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { DateComponent } from '../date/date.component';
import { InputComponent } from '../input/input.component';
import { RadiobuttonComponent } from '../radiobutton/radiobutton.component';
import { SelectComponent } from '../select/select.component';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialFormModule,
    InputComponent,
    SelectComponent,
    DateComponent,
    AutocompleteComponent,
    CheckboxComponent,
    RadiobuttonComponent,
    ButtonComponent,
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss',
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
    console.log('🎯 DynamicForm ngOnInit - fields recibidos:', this.fields);
    this.form = this.createControl();
    console.log('📝 Formulario creado con controles:', Object.keys(this.form.controls));
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
    this.fields.forEach((field) => {
      if (field.type === 'button') {
        return;
      }
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
      const validList = validations.map((valid) => valid.validator);
      return Validators.compose(validList);
    }
    return null;
  }

  validateAllFormFields(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((field) => {
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
