import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { RadioButtonFieldConfig } from '../../model/radiobutton.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-radiobutton.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './radiobutton.component.html',
  styleUrl: './radiobutton.component.scss'
})
export class RadiobuttonComponent implements OnInit, DynamicFormComponent {
  field!: RadioButtonFieldConfig;
  group!: FormGroup;
  accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
