import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';
import { ButtonFieldConfig } from '../../model/button.interface';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent implements OnInit, DynamicFormComponent {

  @Input() field!: ButtonFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
