import { TestBed } from '@angular/core/testing';

import { DesgloseMayorizacionCcService } from './desglose-mayorizacion-cc.service';

describe('DesgloseMayorizacionCcService', () => {
  let service: DesgloseMayorizacionCcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesgloseMayorizacionCcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
