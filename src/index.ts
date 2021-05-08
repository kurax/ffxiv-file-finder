import dotenv from 'dotenv';

import ArchiveUI from './ArchiveUI';

dotenv.config();

const sqpackDir = process.env.SQPACK_DIR;
const archive = new ArchiveUI(sqpackDir);
(async () => {
    // archive.bruteForce(archive.extractTexFromUld());
    // await archive.extractRaw('ui/icon/000000/000000.tex');
    // archive.generateSql();
})();
