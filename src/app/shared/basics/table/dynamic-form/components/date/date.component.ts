import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { DateFieldConfig } from '../../model/date.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-date',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule
  ],
  templateUrl: './date.component.html',
  styleUrl: './date.component.scss'
})
export class DateComponent implements OnInit, DynamicFormComponent {
  @Input() field!: DateFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
