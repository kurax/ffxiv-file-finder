import path from 'path';

import Archive from './Archive';

export default class ArchiveUI extends Archive {
    constructor(sqpackDir: string) {
        super(path.join(sqpackDir, 'ffxiv\\060000.win32.index'));
    }

    *bruteForce_Icons() {
        for (let i = 0; i <= 150000; i++) {
            const filePart = i.toString().padStart(6, '0');
            const pathPart = filePart.substr(0, 3).padEnd(6, '0');
            for (const hq of ['', '/hq']) yield `ui/icon/${pathPart}${hq}/${filePart}.tex`;
        }
    }

    *bruteForce_LoadingImages() {
        for (let i = 0; i <= 99; i++)
            yield `ui/loadingimage/-nowloading_base${i === 0 ? '' : i.toString().padStart(2, '0')}.tex`;
    }

    *bruteForce_Maps() {
        for (const word of ['default', 'region', 'world']) {
            for (let i = 0; i <= 99; i++) {
                const num = i.toString().padStart(2, '0');
                for (const size of ['m', 's']) yield `ui/map/${word}/${num}/${word}${num}_${size}.tex`;
            }
        }
        for (let first = 97; first <= 122; first++) {
            for (let second = 48; second <= 122; second++) {
                if (second >= 58 && second <= 96) continue;
                for (let third = 97; third <= 122; third++) {
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
}
