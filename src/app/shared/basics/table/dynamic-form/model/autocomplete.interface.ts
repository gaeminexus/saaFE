export interface AutocompleteOption {
  codigo?: string | number;
  codigoAlterno?: string;
  [key: string]: any;
}

export interface AutocompleteCollection {
  codigo?: string | number;
  codigoAlterno?: string;
  [key: string]: any;
}

import { FieldConfig } from './field.interface';

export interface AutocompleteField extends FieldConfig {
  type: 'autocomplete';
  name: string;
  collections: AutocompleteCollection[];
  selectField: string[];
  filterFather?: string;
  rubroAlterno?: number;
  value?: any;
  selected?: any;
  autocompleteType?: number;
}
