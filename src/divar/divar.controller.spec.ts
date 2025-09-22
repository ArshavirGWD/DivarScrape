import { Test, TestingModule } from '@nestjs/testing';
import { DivarController } from './divar.controller';

describe('DivarController', () => {
  let controller: DivarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DivarController],
    }).compile();

    controller = module.get<DivarController>(DivarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
