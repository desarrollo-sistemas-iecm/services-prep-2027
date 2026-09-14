import AdmZip from 'adm-zip';
import { crearZipBuffer } from '../utils/zip-buffer.util';

describe('crearZipBuffer', () => {
  it('should produce a zip whose entries round-trip byte-for-byte', async () => {
    const buffer = await crearZipBuffer([
      { name: 'a.csv', content: Buffer.from('hola') },
      { name: 'b.txt', content: Buffer.from('mundo') },
    ]);

    const zip = new AdmZip(buffer);
    const nombres = zip
      .getEntries()
      .map((entrada) => entrada.entryName)
      .sort();

    expect(nombres).toEqual(['a.csv', 'b.txt']);
    expect(zip.readFile('a.csv')?.toString()).toBe('hola');
    expect(zip.readFile('b.txt')?.toString()).toBe('mundo');
  });

  it('should produce an empty-but-valid zip when given no entries', async () => {
    const buffer = await crearZipBuffer([]);
    const zip = new AdmZip(buffer);
    expect(zip.getEntries()).toHaveLength(0);
  });
});
