import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { MessageVarService } from '../../service/message-var.service';
import { SelectFieldConfig, SelectOption } from '../../model/select.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';

@Component({
  selector: 'app-select.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss'
})
export class SelectComponent implements OnInit, DynamicFormComponent  {

  field!: SelectFieldConfig;
  group!: FormGroup;
  accion!: number;

  constructor(
    private messageVarService: MessageVarService
  ) { }

  ngOnInit(): void {
  }

  concatNombre(field: SelectFieldConfig, item: SelectOption): string {
    let result = '';
    if (field.selectField && field.selectField.length > 0) {
      let tmp = '';
      field.selectField.forEach((fieldPath: string) => {
        if (fieldPath) {
          const depth = this.numPuntos(fieldPath);
          if (depth === 1) {
            tmp = item[fieldPath];
          } else if (depth === 2) {
            const [p0, p1] = [this.recP(fieldPath, 0), this.recP(fieldPath, 1)];
            tmp = item[p0]?.[p1];
          } else if (depth === 3) {
            const [p0, p1, p2] = [this.recP(fieldPath, 0), this.recP(fieldPath, 1), this.recP(fieldPath, 2)];
            tmp = item[p0]?.[p1]?.[p2];
          } else {
            tmp = '';
          }
          result = result + (tmp ? `${tmp} - ` : '');
        }
      });
      result = result.length > 3 ? result.slice(0, -3) : result;
    }
    return result;
  }

  numPuntos(cadena: string): number {
    return cadena.split('.').length;
  }

  recP(cadena: string, posicion: number): string {
    return cadena.split('.')[posicion];
  }

  seleccion(item: SelectOption): void {
    if (item.codigo !== undefined) {
      this.messageVarService.setParent(item.codigo);
    }
  }

  escogeHijos(): SelectOption[] | undefined {
    if (this.field.autocompleteType === 2) {
      const parentId = this.messageVarService.getParent();
      const filterFather = this.field.filterFather;
      const collections = this.field.collections;

      if (collections) {
        if (parentId && filterFather) {
          return collections.filter(item =>
            item[filterFather]?.codigo === parentId
          );
        }
        return collections;
      }
    }
    return undefined;
  }

  private filtraHijos(idParent: number, nombrePadre: string): (item: SelectOption) => boolean {
    return (item: SelectOption): boolean => {
      const parent = item[nombrePadre];
      return parent && typeof parent === 'object' && 'codigo' in parent && parent.codigo === idParent;
    };
  }

}
