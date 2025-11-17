import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FieldConfig } from '../../../../shared/basics/table/dynamic-form/model/field.interface';
import { FieldFormat } from '../../../../shared/basics/table/model/field-format-interface';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
import { EntidadesContabilidad } from '../../model/entidades-cnt';
import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { TableBasicHijosComponent } from '../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';

@Component({
  selector: 'app-naturaleza-cuenta.component',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    MaterialFormModule,
    TableBasicHijosComponent
  ],
  templateUrl: './naturaleza-cuenta.component.html',
  styleUrl: './naturaleza-cuenta.component.scss'
})
export class NaturalezaCuentaComponent implements OnInit  {

  regConfig: FieldConfig[] = [
    {
      type: 'input',
      label: 'Nombre',
      inputType: 'text',
      name: 'nombre',
      value: null,
      validations: [
        {
          name: 'required',
          validator: Validators.required,
          message: 'Nombre requerido'
        },
      ]
    }
  ];

  fieldsAnios: FieldFormat[] = [
    {
      column: 'codigo',
      header: 'C\u00D3DIGO',
    },
    {
      column: 'nombre',
      header: 'NOMBRE',
    },
    {
      column: 'estado',
      header: 'ESTADO',
    },
    {
      column: 'manejaCentroCosto',
      header: 'MANEJA CENTRO COSTO',
    },

  ];

  tableConfig: TableConfig = {
    fields: this.fieldsAnios,
    regConfig: this.regConfig,
    entidad: EntidadesContabilidad.NATURALEZA_CUENTA,
    tiene_hijos: false,
    es_hijo: false,
    edit: true,
    add: true,
    remove: true,
    footer: true,
  };

  constructor(
    private naturalezaCuentaService: NaturalezaCuentaService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener datos del resolver
    this.route.data.subscribe(data => {
      this.tableConfig.registros = data['naturalezaCuentas'];
    });
  }

}
