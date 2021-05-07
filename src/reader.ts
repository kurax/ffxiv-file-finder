import * as BinaryReader from 'binary-reader';
import { promisify } from 'util';

export interface Reader {
    current: () => number;
    read: (size: number) => Promise<Buffer>;
    seek: (position: number) => Promise<void>;
    readInt: () => Promise<number>;
    readInt16: () => Promise<number>;
    readInt32: () => Promise<number>;
    readInt64: () => Promise<number>;
    readSha1: () => Promise<string>;
}

export default function createReader(file: string): Reader {
    const reader = BinaryReader.open(file);
    const readNumber = (size: number, method: string) =>
        promisify((callback: (err: Error | null, result?: number) => void) =>
            reader.read(size, (length: number, buffer: Buffer) => {
                if (length !== size) callback(new Error(`Length should be ${size} bytes (got ${length})`));
                else callback(null, buffer[method](0, size));
            })
        );
    return {
        current: () => reader.tell(),
        read: promisify((size: number, callback: (err: Error | null, buf: Buffer) => void) =>
            reader.read(size, (_: number, buffer: Buffer) => callback(null, buffer))
        ),
        seek: promisify((position: number, callback: (err: Error | null) => void) =>
            reader.seek(position, () => callback(null))
        ),
        readSha1: promisify((callback: (err: Error, sha1: string) => void) =>
            reader.read(20, (_: number, buffer: Buffer) => callback(null, buffer.toString('hex')))
        ),
        readInt: readNumber(6, 'readUIntLE'),
        readInt16: readNumber(2, 'readUInt16LE'),
        readInt32: readNumber(4, 'readUInt32LE'),
        readInt64: readNumber(8, 'readBigUInt64LE')
    };
}
