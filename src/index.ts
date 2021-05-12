import dotenv from 'dotenv';

import ArchiveUI from './ArchiveUI';

dotenv.config();

const sqpackDir = process.env.SQPACK_DIR;
const archive = new ArchiveUI(sqpackDir);
(async () => {
    // await archive.findByGenerator(archive.generateIcons());
    // await archive.bruteForce('ui/common/creditstaffinfo', '.ugd', 5);
    // await archive.writeToDatabase();
    // archive.generateSql();
})();
