import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';

describe('FuelController', () => {
  let controller: FuelController;
  let service: { getLatestPriceForLocality: jest.Mock };

  beforeEach(async () => {
    service = { getLatestPriceForLocality: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [FuelController],
      providers: [{ provide: FuelService, useValue: service }],
    }).compile();

    controller = module.get<FuelController>(FuelController);
  });

  it('does not require an auth guard for latest fuel price', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      FuelController.prototype.latest,
    );

    expect(guards).toBeUndefined();
  });

  it('forwards optional locality to FuelService', async () => {
    const response = {
      effectiveDate: '2026-04-16',
      ron95Price: 1.99,
      dieselPrice: 2.15,
    };
    service.getLatestPriceForLocality.mockResolvedValue(response);

    await expect(controller.latest('Kuching, Sarawak')).resolves.toBe(response);
    expect(service.getLatestPriceForLocality).toHaveBeenCalledWith(
      'Kuching, Sarawak',
    );
  });

  it('passes undefined locality for anonymous requests', async () => {
    const response = {
      effectiveDate: '2026-04-16',
      ron95Price: 1.99,
      dieselPrice: 5.97,
    };
    service.getLatestPriceForLocality.mockResolvedValue(response);

    await expect(controller.latest()).resolves.toBe(response);
    expect(service.getLatestPriceForLocality).toHaveBeenCalledWith(undefined);
  });
});
