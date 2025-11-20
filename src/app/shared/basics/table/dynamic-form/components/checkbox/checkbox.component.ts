import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CheckboxFieldConfig } from '../../model/checkbox.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule
  ],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss'
})
export class CheckboxComponent implements OnInit, DynamicFormComponent {
  @Input() field!: CheckboxFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
