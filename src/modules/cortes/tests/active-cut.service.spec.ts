import { Repository } from 'typeorm';
import { CorteReleaseEntity } from '../entities/corte-release.entity';
import { CorteStatus } from '../enums/corte-status.enum';
import { ActiveCutService } from '../services/active-cut.service';

function createService(existsResults: boolean[]): {
  service: ActiveCutService;
  exists: jest.Mock;
} {
  const exists = jest.fn();
  existsResults.forEach((result) => exists.mockResolvedValueOnce(result));
  const repository = { exists } as unknown as Repository<CorteReleaseEntity>;
  return { service: new ActiveCutService(repository), exists };
}

describe('ActiveCutService', () => {
  it('should return false when no corte has been activated', async () => {
    const { service, exists } = createService([false]);

    const result = await service.hasActiveCut();

    expect(result).toBe(false);
    expect(exists).toHaveBeenCalledWith({
      where: { status: CorteStatus.ACTIVATED },
    });
  });

  it('should query again when the previous check found no active corte', async () => {
    const { service, exists } = createService([false, true]);

    await service.hasActiveCut();
    const result = await service.hasActiveCut();

    expect(result).toBe(true);
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it('should not query again when an active corte was already confirmed', async () => {
    const { service, exists } = createService([true]);

    await service.hasActiveCut();
    const result = await service.hasActiveCut();

    expect(result).toBe(true);
    expect(exists).toHaveBeenCalledTimes(1);
  });
});
