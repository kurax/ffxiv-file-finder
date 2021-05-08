import { generate } from 'brute-force-generator';
import { str } from 'crc-32';
import { createHash } from 'crypto';

const generateLevel1Chars = () => {
    const chars = [];
    for (let i = 97; i <= 122; i++) chars.push(String.fromCharCode(i));
    return chars;
};

const generateLevel2Chars = () => {
    const chars = generateLevel1Chars();
    for (let i = 48; i <= 57; i++) chars.push(String.fromCharCode(i));
    chars.push('_');
    return chars;
};

export const hashSha1 = (data: any) => createHash('sha1').update(data).digest('hex');
export const hashCrc32 = (data: string) => (0xffffffff - str(data)) >>> 0;
export const hashCrc32Signed = (data: string) => (0xffffffff - str(data)) << 0;
export const bruteForceLevel1 = (length: number) => generate(generateLevel1Chars(), length);
export const bruteForceLevel2 = (length: number) => generate(generateLevel2Chars(), length);
