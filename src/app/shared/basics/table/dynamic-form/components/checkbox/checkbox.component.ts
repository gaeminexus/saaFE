import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CheckboxFieldConfig } from '../../model/checkbox.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCheckboxModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class CheckboxComponent implements OnInit, DynamicFormComponent {
  @Input() field!: CheckboxFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() {}

  ngOnInit(): void {
    console.log('☑️ CheckboxComponent init - field:', this.field.name, 'label:', this.field.label);
    console.log('☑️ FormGroup:', this.group);
    console.log('☑️ Control exists:', this.group.get(this.field.name));
  }
}
