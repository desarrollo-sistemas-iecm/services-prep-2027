import * as fs from 'fs';
import * as path from 'path';

export default function globalTeardown(): void {
  fs.rmSync(path.resolve(__dirname, '../data/control_test.db3'), {
    force: true,
  });
  fs.rmSync(path.resolve(__dirname, 'fixtures/resultados-fixture_test.db3'), {
    force: true,
  });
}
