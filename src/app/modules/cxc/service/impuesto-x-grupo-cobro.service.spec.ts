import { TestBed } from '@angular/core/testing';

import { ImpuestoXGrupoCobroService } from './impuesto-x-grupo-cobro.service';

describe('ImpuestoXGrupoCobroService', () => {
  let service: ImpuestoXGrupoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImpuestoXGrupoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
