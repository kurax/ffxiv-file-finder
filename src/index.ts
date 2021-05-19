import dotenv from 'dotenv';

import ArchiveCharacter from './ArchiveCharacter';
import ArchiveUI from './ArchiveUI';

dotenv.config();

const sqpackDir = process.env.SQPACK_DIR;
// const archiveUI = new ArchiveUI(sqpackDir);
const archiveChar = new ArchiveCharacter(sqpackDir);
(async () => {
    // await archiveUI.findByGenerator(archiveUI.generateIcons());
    // await archiveUI.bruteForce('ui/common/creditstaffinfo', '.ugd', 5);
    // await archiveUI.writeToDatabase();
    // archiveUI.generateSql();
    // await archiveUI.extractRawFile('ui/common/creditcastdata.ugd');

    await archiveChar.findByGenerator(archiveChar.generateTexFromMtrl());
})();
