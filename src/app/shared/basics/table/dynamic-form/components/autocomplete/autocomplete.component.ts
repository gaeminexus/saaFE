import { Component, OnInit } from '@angular/core';
import { MaterialFormModule } from '../../../../../modules/material-form.module';
import { FormGroup, FormControl } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
import { AutocompleteField, AutocompleteCollection, AutocompleteOption } from '../../model/autocomplete.interface';
import { MessageVarService } from '../../service/message-var.service';
import { AccionesGrid } from '../../../../constantes';
import { DetalleRubroService } from '../../../../../services/detalle-rubro.service';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';
import { Validator } from '../../model/field.interface';

@Component({
  selector: 'app-autocomplete.component',
  standalone: true,
  imports: [
    MaterialFormModule
  ],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss'
})
export class AutocompleteComponent implements OnInit, DynamicFormComponent {
  field!: AutocompleteField;
  group!: FormGroup;
  accion: number = 0;
  filteredOptions!: Observable<AutocompleteCollection[]>;
  filteredOptionsHijo!: Observable<AutocompleteCollection[]>;
  myControl = new FormControl<string>('');
  myControlHijo = new FormControl<string>('');

  getControl(name: string) {
    return this.group.get(name);
  }

  constructor(
    private messageVarService: MessageVarService,
    public detalleRubroService: DetalleRubroService,
  ) { }

  ngOnInit(): void {

    // CARGA COLLECCION EN CASO DE SER RUBRO
    if (this.field.rubroAlterno) {
      this.field.collections = this.detalleRubroService.getDetallesByParent(Number(this.field.rubroAlterno));
    }

    if (this.field.autocompleteType === 1) {
      if (this.accion === AccionesGrid.EDIT) {
        if (this.field.rubroAlterno) {
          this.myControl.setValue(
            this.detalleRubroService.getDescripcionByParentAndAlterno(Number(this.field.rubroAlterno), this.field.value));
        } else {
          this.myControl.setValue(this.concatNombre(this.field, this.field.selected));
          this.messageVarService.setParent(this.field.value?.codigo);
        }
      }
      this.filteredOptions = this.myControl.valueChanges.pipe(
        startWith(''),
        map(value => {
          if (value) {
            return this._filter(value);
          } else {
            if (!this.myControl.value) {
              const control = this.group.get(this.field['name'] || '');
              if (control) {
                control.setValue(null);
              }
            }
            return this.field.collections;
          }
        })
      );
    }

    if (this.field.autocompleteType === 2) {

      if (this.accion === AccionesGrid.EDIT) {
        this.myControlHijo.setValue(this.concatNombre(this.field, this.field.selected));
      }

      this.messageVarService.padre$.subscribe(() => {
        this.myControlHijo.setValue('');
        const control = this.group.get(this.field['name'] || '');
        if (control) {
          control.setValue(null);
        }
      });

      this.filteredOptionsHijo = this.myControlHijo.valueChanges.pipe(
        startWith(''),
        map(value => {
          if (value) {
            return this._filterHijo(value) || [];
          } else {
            if (!this.myControlHijo.value) { // PARA QUE NO BORRE EL VALOR CUANDO EDITA
              const control = this.group.get(this.field['name'] || '');
              if (control) {
                control.setValue(null);
              }
            }
            return this.escogeHijos() || [];
          }
        })
      );
    }

  }

  private _filter(value: any): any {
    if (value) {
      if (!value.codigo) {
        const filterValue = value.toLowerCase();
        // return this.field.collections.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
        return this.field.collections.filter(this.filtraCombo(this.field.selectField, filterValue));
      } else {
        return this.field.collections;
      }
    }
  }

  onFocus(): any{
    // SIRVE PARA RESETEAR EL COMBO CUANDO NO HAY VALORES
    this.myControlHijo.setValue('');
  }

  private _filterHijo(value: string | AutocompleteOption): AutocompleteCollection[] | null {
    if (value) {
      const hijos = this.escogeHijos();
      if (!hijos) return null;

      if (typeof value === 'string') {
        const filterValue = value.toLowerCase();
        return hijos.filter(this.filtraCombo(this.field.selectField || [], filterValue));
      } else if (!value.codigo) {
        const filterValue = String(value).toLowerCase();
        return hijos.filter(this.filtraCombo(this.field.selectField || [], filterValue));
      }
      return hijos;
    }
    return this.escogeHijos();
  }

  public concatNombre(field: AutocompleteField, item: AutocompleteCollection | null): string {
    if (!item || !field.selectField) return '';

    let result = '';
    let tmp = '';

    field.selectField.forEach((element: string) => {
      if (element) {
        const depth = this.numPuntos(element);
        if (depth === 1) {
          tmp = item[element];
        } else if (depth === 2) {
          const [p0, p1] = element.split('.');
          tmp = item[p0]?.[p1];
        } else if (depth === 3) {
          const [p0, p1, p2] = element.split('.');
          tmp = item[p0]?.[p1]?.[p2];
        } else {
          tmp = '';
        }
        result = result + (tmp ? `${tmp} - ` : '');
      }
    });

    return result.length > 3 ? result.slice(0, -3) : result;
  }

  numPuntos(cadena: string): number {
    return cadena.split('.').length;
  }

  recP(cadena: string, posicion: number): string {
    return cadena.split('.')[posicion];
  }

  seleccion(item: any): void {
    /* console.log(item);
    console.log(item.option.value); */
    const control = this.group.get(this.field['name'] || '');
    if (control) {
      if (this.field.rubroAlterno) {
        // asigna solo el codigo alterno al valor
        control.setValue(item.option.value.codigoAlterno);
      } else {
        // asigna todo el registro al valor
        control.setValue(item.option.value);
      }
      this.myControl.setValue(this.concatNombre(this.field, item.option.value));
      // VALOR PARA COMBOS HIJOS
      this.messageVarService.setParent(item.option.value.codigo);
      this.messageVarService.reload(item.option.value.codigo);
    }
  }

   seleccionHijo(item: any): void {
    /* console.log(item);
    console.log(item.option.value);*/
    const control = this.group.get(this.field['name'] || '');
    if (control) {
      control.setValue(item.option.value);
      this.myControlHijo.setValue(this.concatNombre(this.field, item.option.value));
    }
  }

  private escogeHijos(): AutocompleteCollection[] | null {
    if (this.field.autocompleteType === 2) {
      const parentValue = this.messageVarService.getParent();
      const filterFather = this.field.filterFather;
      if (parentValue && filterFather && this.field.collections) {
        return this.field.collections.filter(item => {
          const parentField = item[filterFather];
          return parentField && typeof parentField === 'object' && 'codigo' in parentField &&
                 parentField.codigo === parentValue;
        });
      }
    }
    return null;
  }

  filtraHijos(idParent: number, nombrePadre: string): any {
    // tslint:disable-next-line: only-arrow-functions
    return function(element: any): any {
      return (element[nombrePadre].codigo === idParent);
    };
  }

  /* filtraCombo(selectField: string, nombreCampo: string): any {
    // tslint:disable-next-line: only-arrow-functions
    return function(element: any): any {
      return (element[selectField].toLowerCase().indexOf(nombreCampo) === 0);
    };
  }*/

  private filtraCombo(selectField: string[], nombreCampo: string): (item: AutocompleteCollection) => boolean {
    const self = this;
    return function(element: AutocompleteCollection): boolean {
      let result = '';
      if (selectField && selectField.length > 0) {
        let tmp = '';
        selectField.forEach((campo: string) => {
          if (campo) {
            const depth = self.numPuntos1(campo);
            if (depth === 1) {
              tmp = element[campo];
            } else if (depth === 2) {
              const [p0, p1] = campo.split('.');
              tmp = element[p0]?.[p1];
            } else if (depth === 3) {
              const [p0, p1, p2] = campo.split('.');
              tmp = element[p0]?.[p1]?.[p2];
            } else {
              tmp = '';
            }
            result = result + (tmp ? `${tmp} - ` : '');
          }
        });
        result = result.slice(0, -3);
      }
      return typeof result === 'string' && result.toLowerCase().includes(nombreCampo.toLowerCase());
    };
  }

  private numPuntos1(cadena: string): number {
    return cadena.split('.').length;
  }

  private recP1(cadena: string, posicion: number): string {
    const parts = cadena.split('.');
    return parts[posicion] || '';
  }

  ngOnDestroy(): void {
    if (this.field.autocompleteType === 1) {
      this.messageVarService.setParent(null);
    }
  }

}
