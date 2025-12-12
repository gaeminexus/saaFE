import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { InputFieldConfig } from '../../model/input.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent implements OnInit, DynamicFormComponent {
  @Input() field!: InputFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() {}

  ngOnInit(): void {
    // Si el campo requiere transformación a mayúsculas
    if (this.field.transformToUppercase) {
      const control = this.group.get(this.field.name);
      if (control) {
        control.valueChanges.subscribe((value: any) => {
          if (typeof value === 'string' && value !== value.toUpperCase()) {
            control.setValue(value.toUpperCase(), { emitEvent: false });
          }
        });
      }
    }
  }
}
