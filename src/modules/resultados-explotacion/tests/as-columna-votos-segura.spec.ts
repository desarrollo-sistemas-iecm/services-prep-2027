import { asColumnaVotosSegura } from '../services/tipo-eleccion-catalogo.service';

describe('asColumnaVotosSegura', () => {
  it('should accept a well-formed votos_part_N column name', () => {
    expect(asColumnaVotosSegura('votos_part_1')).toBe('votos_part_1');
    expect(asColumnaVotosSegura('votos_part_35')).toBe('votos_part_35');
  });

  it('should accept a well-formed total_votos_ccN column name', () => {
    expect(asColumnaVotosSegura('total_votos_cc9')).toBe('total_votos_cc9');
  });

  it('should reject a column name that does not match the allowlist', () => {
    expect(() =>
      asColumnaVotosSegura('votos_part_1; DROP TABLE prep_votos'),
    ).toThrow();
    expect(() => asColumnaVotosSegura('id_distrito')).toThrow();
    expect(() => asColumnaVotosSegura('')).toThrow();
  });
});
