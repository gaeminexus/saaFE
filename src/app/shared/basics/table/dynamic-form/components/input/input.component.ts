import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';
import { InputFieldConfig } from '../../model/input.interface';

@Component({
  selector: 'app-input.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit, DynamicFormComponent {

  field!: InputFieldConfig;
  group!: FormGroup;
  accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
