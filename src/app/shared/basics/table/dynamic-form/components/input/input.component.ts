import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';
import { InputFieldConfig } from '../../model/input.interface';
import { MaterialFormModule } from '../../../../../modules/material-form.module';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit, DynamicFormComponent {

  @Input() field!: InputFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor() { }

  ngOnInit(): void {
  }

}
