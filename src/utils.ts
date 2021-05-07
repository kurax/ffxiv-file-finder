import { str } from 'crc-32';
import { createHash } from 'crypto';

export const hashSha1 = (data: any) => createHash('sha1').update(data).digest('hex');
export const hashCrc32 = (data: string) => (0xffffffff - str(data)) >>> 0;
export const hashCrc32Signed = (data: string) => (0xffffffff - str(data)) << 0;
