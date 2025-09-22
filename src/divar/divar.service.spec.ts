import { Test, TestingModule } from '@nestjs/testing';
import { DivarService } from './divar.service';

describe('DivarService', () => {
  let service: DivarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DivarService],
    }).compile();

    service = module.get<DivarService>(DivarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
