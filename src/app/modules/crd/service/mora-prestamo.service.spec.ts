import { TestBed } from '@angular/core/testing';

import { MoraPrestamoService } from './mora-prestamo.service';

describe('MoraPrestamoService', () => {
  let service: MoraPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoraPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
