import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { DateFieldConfig } from '../../model/date.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-date.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './date.component.html',
  styleUrl: './date.component.scss'
})
export class DateComponent implements OnInit, DynamicFormComponent {
  field!: DateFieldConfig;
  group!: FormGroup;
  accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
