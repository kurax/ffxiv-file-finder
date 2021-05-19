import path from 'path';

import Archive from './Archive';

export default class ArchiveCharacter extends Archive {
    constructor(sqpackDir: string) {
        super(path.join(sqpackDir, 'ffxiv\\040000.win32.index'));
    }

    async *generateTexFromMtrl() {
        const indexData = await this.loadIndexData();
        for (const pathCrc of Object.keys(indexData))
            for (const fileCrc of Object.keys(indexData[pathCrc])) {
                const location = indexData[pathCrc][fileCrc];
                const data = await this.extractRawDataByLocation(location);
                if (data == null) continue;
                console.log(data.length);
                // break;
            }
    }
}
