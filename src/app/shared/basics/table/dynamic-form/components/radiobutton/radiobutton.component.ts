import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RadioButtonFieldConfig } from '../../model/radiobutton.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-radiobutton',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatRadioModule,
    MatFormFieldModule
  ],
  templateUrl: './radiobutton.component.html',
  styleUrl: './radiobutton.component.scss'
})
export class RadiobuttonComponent implements OnInit, DynamicFormComponent {
  @Input() field!: RadioButtonFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
