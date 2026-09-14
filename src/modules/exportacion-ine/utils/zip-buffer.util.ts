export interface ZipEntryBuffer {
  name: string;
  content: Buffer;
}

/**
 * Empaqueta las entradas dadas en un ZIP, todo en memoria (sin tocar disco), usando `archiver` con
 * streaming a un Buffer — evita el problema de archivos temporales huérfanos del PHP original.
 */
export async function crearZipBuffer(
  entradas: ZipEntryBuffer[],
): Promise<Buffer> {
  // Dynamic import para cargar archiver (ESM) en entorno CommonJS
  const { ZipArchive } = await import('archiver');

  return new Promise<Buffer>((resolve, reject) => {
    const archivo = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archivo.on('data', (chunk: Buffer) => chunks.push(chunk));
    archivo.on('error', (error: Error) => reject(error));
    archivo.on('end', () => resolve(Buffer.concat(chunks)));

    for (const entrada of entradas) {
      archivo.append(entrada.content, { name: entrada.name });
    }

    void archivo.finalize();
  });
}
