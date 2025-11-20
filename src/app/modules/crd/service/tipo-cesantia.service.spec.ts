import { TestBed } from '@angular/core/testing';

import { TipoCesantiaService } from './tipo-cesantia.service';

describe('TipoCesantiaService', () => {
  let service: TipoCesantiaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoCesantiaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
