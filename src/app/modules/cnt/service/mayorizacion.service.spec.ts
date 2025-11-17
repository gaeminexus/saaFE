import { TestBed } from '@angular/core/testing';

import { MayorizacionService } from './mayorizacion.service';

describe('MayorizacionService', () => {
  let service: MayorizacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MayorizacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
