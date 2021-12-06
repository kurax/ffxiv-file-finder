import path from 'path';

import { createMemoryReader } from './reader';
import { hashCrc32 } from './utils';
import Archive from './Archive';

export default class ArchiveUI extends Archive {
    constructor(sqpackDir: string) {
        super(path.join(sqpackDir, 'ffxiv\\060000.win32.index'));
    }

    async *generateIcons() {
        const directories = ['hq', 'chs', 'en', 'ja'];
        for (let i = 0; i <= 200000; i++) {
            const filePart = i.toString().padStart(6, '0');
            const pathPart = filePart.substr(0, 3).padEnd(6, '0');
            yield `ui/icon/${pathPart}/${filePart}.tex`;
            yield `ui/icon/${pathPart}/${filePart}_hr1.tex`;
            for (const dir of directories) yield `ui/icon/${pathPart}/${dir}/${filePart}.tex`;
        }
    }

    async *generateLoadingImages() {
        for (let i = 0; i <= 99; i++) {
            yield `ui/loadingimage/-nowloading_base${i === 0 ? '' : i.toString().padStart(2, '0')}.tex`;
            yield `ui/loadingimage/-nowloading_base${i === 0 ? '' : i.toString().padStart(2, '0')}_hr1.tex`;
        }
    }

    async *generateMaps() {
        for (const word of ['default', 'region', 'world'])
            for (let i = 0; i <= 99; i++) {
                const num = i.toString().padStart(2, '0');
                for (const size of ['m', 's']) yield `ui/map/${word}/${num}/${word}${num}_${size}.tex`;
            }

        for (let first = 48; first <= 122; first++) {
            if (first >= 58 && first <= 96) continue;
            for (let second = 48; second <= 122; second++) {
                if (second >= 58 && second <= 96) continue;
                for (let third = 48; third <= 122; third++) {
                    if (third >= 58 && third <= 96) continue;
                    for (let fourth = 48; fourth <= 122; fourth++) {
                        if (fourth >= 58 && fourth <= 96) continue;
                        const name =
                            String.fromCharCode(first) +
                            String.fromCharCode(second) +
                            String.fromCharCode(third) +
                            String.fromCharCode(fourth);
                        for (let i = 0; i <= 99; i++) {
                            const num = i.toString().padStart(2, '0');
                            for (const variant of ['_m', '_s', 'd', 'm_m', 'm_s'])
                                yield `ui/map/${name}/${num}/${name}${num}${variant}.tex`;
                        }
                    }
                }
            }
        }
    }

    async *generateTexFromUld() {
        const uldPath = 'ui/uld';
        const data = (await this.loadIndexData())[hashCrc32(uldPath)];
        if (data == null) return;

        const filenames = new Set<string>();
        const locations = Object.values(data).map(value => value[1]);
        for (const location of locations) {
            const data = await this.extractRawDataByLocation(location);
            if (data == null) {
                console.log(`Unknown data format at ${location}`);
                continue;
            }
            if (data.toString('ascii', 0, 8) === 'uldh0100') {
                const reader = createMemoryReader(data);
                // ULDH signature
                await reader.read(8);
                // Go to first atkh segment
                await reader.seek(await reader.readInt32());
                // ATKH signature
                if ((await reader.read(8)).toString() === 'atkh0100') {
                    // ATKH header
                    for (let i = 0; i < 7; i++) await reader.readInt32();
                    // ASHD signature
                    if ((await reader.read(8)).toString() === 'ashd0101') {
                        // Texture count
                        const count = await reader.readInt32();
                        // Unknown
                        await reader.readInt32();
                        for (let i = 0; i < count; i++) {
                            // Index number
                            await reader.readInt32();
                            // File name
                            const buffer = await reader.read(48);
                            const filename = buffer.slice(0, buffer.indexOf('\u0000')).toString();
                            if (filename.trim() !== '') filenames.add(filename);
                            // Fixed value 0x3
                            await reader.readInt32();
                        }
                    }
                }
            }
        }

        for (const filename of filenames) {
            yield filename;
            yield filename.split('.').slice(0, -1).concat('uld').join('.');

            let paths = filename.split('/');
            paths.splice(paths.length - 1, 0, 'light');
            const filename1 = paths.join('/');
            yield filename1;
            yield filename1.split('.').slice(0, -1).concat('uld').join('.');

            paths = filename.split('/');
            paths.splice(paths.length - 1, 0, 'third');
            const filename2 = paths.join('/');
            yield filename2;
            yield filename2.split('.').slice(0, -1).concat('uld').join('.');
        }
    }
}
