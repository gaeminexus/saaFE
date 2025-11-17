import { TestBed } from '@angular/core/testing';

import { BotOpcionService } from './bot-opcion.service';

describe('BotOpcionService', () => {
  let service: BotOpcionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BotOpcionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
