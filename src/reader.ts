import * as BinaryReader from 'binary-reader';
import { promisify } from 'util';

export interface Reader {
    current: () => number;
    read: (size: number) => Promise<Buffer>;
    seek: (position: number) => Promise<void>;
    seekRelative: (position: number) => Promise<void>;
    readInt: () => Promise<number>;
    readInt16: () => Promise<number>;
    readInt32: () => Promise<number>;
    readInt64: () => Promise<number>;
    readSha1: () => Promise<string>;
}

export function createReader(file: string): Reader {
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
        seekRelative: promisify((position: number, callback: (err: Error | null) => void) =>
            reader.seek(position, { current: true }, () => callback(null))
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

export function createMemoryReader(buffer: Buffer): Reader {
    class MemoryReader implements Reader {
        private offset: number;

        private readNumber(size: number, method: string) {
            const result = this.buffer[method](this.offset, size);
            this.offset += size;
            return result;
        }

        constructor(readonly buffer: Buffer) {
            this.offset = 0;
        }

        current() {
            return this.offset;
        }

        async read(size: number) {
            const result = this.buffer.subarray(this.offset, this.offset + size);
            this.offset += result.length;
            return result;
        }

        async seek(position: number) {
            this.offset = position;
        }

        async seekRelative(position: number) {
            this.offset += position;
        }

        async readSha1() {
            return (await this.read(20)).toString('hex');
        }

        async readInt() {
            return this.readNumber(6, 'readUIntLE');
        }

        async readInt16() {
            return this.readNumber(2, 'readUInt16LE');
        }

        async readInt32() {
            return this.readNumber(4, 'readUInt32LE');
        }

        async readInt64() {
            return this.readNumber(8, 'readBigUInt64LE');
        }
    }

    return new MemoryReader(buffer);
}
