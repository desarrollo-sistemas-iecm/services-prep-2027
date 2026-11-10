import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DistribucionQueryDto } from '../dto/distribucion-query.dto';

describe('DistribucionQueryDto', () => {
  it('should accept the body when seccion is omitted', async () => {
    const errores = await validate(
      plainToInstance(DistribucionQueryDto, { type: 2, seleccion: 18 }),
    );

    expect(errores).toHaveLength(0);
  });

  it('should accept seccion when it is a positive integer', async () => {
    const errores = await validate(
      plainToInstance(DistribucionQueryDto, {
        type: 2,
        seleccion: 18,
        seccion: 3188,
      }),
    );

    expect(errores).toHaveLength(0);
  });

  it('should reject seccion when it is lower than 1', async () => {
    const errores = await validate(
      plainToInstance(DistribucionQueryDto, {
        type: 2,
        seleccion: 18,
        seccion: 0,
      }),
    );

    expect(errores.map((error) => error.property)).toEqual(['seccion']);
  });

  it('should reject seccion when it is not an integer', async () => {
    const errores = await validate(
      plainToInstance(DistribucionQueryDto, {
        type: 2,
        seleccion: 18,
        seccion: 2.5,
      }),
    );

    expect(errores.map((error) => error.property)).toEqual(['seccion']);
  });

  it('should reject the body when seleccion is omitted', async () => {
    const errores = await validate(
      plainToInstance(DistribucionQueryDto, { type: 2 }),
    );

    expect(errores.map((error) => error.property)).toEqual(['seleccion']);
  });
});
