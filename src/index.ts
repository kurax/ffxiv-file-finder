import dotenv from 'dotenv';

import ArchiveUI from './ArchiveUI';

dotenv.config();

const sqpackDir = process.env.SQPACK_DIR;
const archive = new ArchiveUI(sqpackDir);
(async () => {
    await archive.bruteForce(archive.extractTexFromUld());
    archive.generateSql();
})();
