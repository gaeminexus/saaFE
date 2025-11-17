import { TestBed } from '@angular/core/testing';

import { MessageVarService } from './message-var.service';

describe('MessageVarService', () => {
  let service: MessageVarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageVarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
