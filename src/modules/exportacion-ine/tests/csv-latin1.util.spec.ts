import { filaCsv } from '../utils/csv-latin1.util';

describe('filaCsv', () => {
  it('should join fields with commas and end with a newline', () => {
    expect(filaCsv(['a', 'b', 'c']).toString('latin1')).toBe('a,b,c\n');
  });

  it('should quote a field containing a comma', () => {
    expect(filaCsv(['a,b', 'c']).toString('latin1')).toBe('"a,b",c\n');
  });

  it('should double internal quotes and wrap the field in quotes', () => {
    expect(filaCsv(['he said "hi"']).toString('latin1')).toBe(
      '"he said ""hi"""\n',
    );
  });

  it('should quote a field containing a newline', () => {
    expect(filaCsv(['line1\nline2']).toString('latin1')).toBe(
      '"line1\nline2"\n',
    );
  });

  it('should render null as an empty field', () => {
    expect(filaCsv([null, 'x']).toString('latin1')).toBe(',x\n');
  });

  it('should render numbers without quoting', () => {
    expect(filaCsv([42, 'x']).toString('latin1')).toBe('42,x\n');
  });

  it('should encode accented characters as Latin-1 bytes, not UTF-8', () => {
    expect(filaCsv(['MÉXICO'])).toEqual(
      Buffer.from([0x4d, 0xc9, 0x58, 0x49, 0x43, 0x4f, 0x0a]),
    );
  });
});
