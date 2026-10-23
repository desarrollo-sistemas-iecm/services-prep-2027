import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActasRpDto } from '../dto/actas-rp.dto';
import { ActasExtranjeroDto } from '../dto/actas-extranjero.dto';

describe('Actas DTOs', () => {
  describe('ActasRpDto', () => {
    it('should accept an empty body when seleccion is omitted', async () => {
      const errores = await validate(plainToInstance(ActasRpDto, {}));

      expect(errores).toHaveLength(0);
    });

    it('should accept seleccion when it is a positive integer', async () => {
      const errores = await validate(
        plainToInstance(ActasRpDto, { seleccion: 5 }),
      );

      expect(errores).toHaveLength(0);
    });

    it('should reject seleccion when it is lower than 1', async () => {
      const errores = await validate(
        plainToInstance(ActasRpDto, { seleccion: 0 }),
      );

      expect(errores.map((error) => error.property)).toEqual(['seleccion']);
    });

    it('should reject seleccion when it is not an integer', async () => {
      const errores = await validate(
        plainToInstance(ActasRpDto, { seleccion: 2.5 }),
      );

      expect(errores.map((error) => error.property)).toEqual(['seleccion']);
    });
  });

  describe('ActasExtranjeroDto', () => {
    it('should accept type when it is a valid tipo de elección', async () => {
      const errores = await validate(
        plainToInstance(ActasExtranjeroDto, { type: 4 }),
      );

      expect(errores).toHaveLength(0);
    });

    it('should reject type when it is outside 1 to 4', async () => {
      const errores = await validate(
        plainToInstance(ActasExtranjeroDto, { type: 5 }),
      );

      expect(errores.map((error) => error.property)).toEqual(['type']);
    });
  });
});
