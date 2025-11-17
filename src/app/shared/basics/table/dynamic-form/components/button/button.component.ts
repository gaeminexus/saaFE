import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';
import { ButtonFieldConfig } from '../../model/button.interface';

@Component({
  selector: 'app-button.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent implements OnInit, DynamicFormComponent {

  field!: ButtonFieldConfig;
  group!: FormGroup;
  accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
