import { Test } from '@nestjs/testing';
import { FuelService } from './fuel.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FuelService', () => {
  let service: FuelService;
  let prisma: { fuelPrice: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = { fuelPrice: { findFirst: jest.fn() } };
    const module = await Test.createTestingModule({
      providers: [
        FuelService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<FuelService>(FuelService);
  });

  it('returns null when no price exists', async () => {
    prisma.fuelPrice.findFirst.mockResolvedValue(null);
    expect(await service.getLatestPrice()).toBeNull();
  });

  it('returns all four price fields from the latest entry', async () => {
    prisma.fuelPrice.findFirst.mockResolvedValue({
      ron95Price: '1.99',
      ron95UnsubsidisedPrice: '4.02',
      dieselPrice: '5.97',
      dieselEastMsiaPrice: '2.15',
      effectiveDate: new Date('2026-04-16'),
    });
    expect(await service.getLatestPrice()).toEqual({
      ron95Price: 1.99,
      ron95UnsubsidisedPrice: 4.02,
      dieselPrice: 5.97,
      dieselEastMsiaPrice: 2.15,
      effectiveDate: new Date('2026-04-16'),
    });
  });

  it('returns null for new fields when not present in db row', async () => {
    prisma.fuelPrice.findFirst.mockResolvedValue({
      ron95Price: '2.05',
      ron95UnsubsidisedPrice: null,
      dieselPrice: '2.15',
      dieselEastMsiaPrice: null,
      effectiveDate: new Date('2026-01-01'),
    });
    const result = await service.getLatestPrice();
    expect(result?.ron95UnsubsidisedPrice).toBeNull();
    expect(result?.dieselEastMsiaPrice).toBeNull();
  });
});
