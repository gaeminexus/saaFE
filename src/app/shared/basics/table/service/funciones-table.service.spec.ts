import { TestBed } from '@angular/core/testing';

import { FuncionesTableService } from './funciones-table.service';

describe('FuncionesTableService', () => {
  let service: FuncionesTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FuncionesTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
