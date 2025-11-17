import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { CheckboxFieldConfig } from '../../model/checkbox.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-checkbox.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss'
})
export class CheckboxComponent implements OnInit, DynamicFormComponent {
  field!: CheckboxFieldConfig;
  group!: FormGroup;
  accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
