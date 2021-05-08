import fs from 'fs';
import { EOL } from 'os';
import path from 'path';
import { inflateRawSync } from 'zlib';

import { createReader, Reader } from './reader';
import { hashCrc32, hashCrc32Signed, hashSha1 } from './utils';

const dataDir = path.join(__dirname, '..', 'data');
const extractDir = path.join(__dirname, '..', 'extract');

export default abstract class Archive {
    private readonly baseFileName: string;
    private readonly indexType: string;

    protected constructor(readonly indexFile: string) {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
        const basename = path.basename(this.indexFile);
        this.baseFileName = path.join(dataDir, basename);
        this.indexType = basename.split('.')[0];
    }

    protected getBruteForceDataFile() {
        return this.baseFileName + '.json';
    }

    protected getBruteForceResultFile() {
        return this.baseFileName + '.txt';
    }

    protected getSqlFile() {
        return this.baseFileName + '.sql';
    }

    protected async readIndexFile() {
        const reader = createReader(this.indexFile);
        // SqPack header
        // Signature
        const signature = await reader.readInt();
        if (signature !== 118074578596179) {
            console.log('Not a SqPack file.');
            return;
        }
        await reader.read(6);
        // Header Length
        const headerLength = await reader.readInt32();
        // Unknown
        await reader.readInt32();
        // SqPack type
        const sqpackType = await reader.readInt32();
        if (sqpackType !== 2) {
            console.log('Not a SqPack index file.');
            return;
        }
        // Unknown
        await reader.seek(0x3c0);
        // Header SHA-1
        const headerSha1 = await reader.readSha1();
        // Padding
        await reader.seek(headerLength);

        // Segment header
        const segmentHeaderLength = await reader.readInt32();
        // Segments
        const segments = [];
        for (let segmentNo = 1; segmentNo <= 4; segmentNo++) {
            const index = await reader.readInt32();
            const offset = await reader.readInt32();
            const size = await reader.readInt32();
            const sha1 = await reader.readSha1();
            await reader.read(0x28);
            if (segmentNo === 1) await reader.read(0x4);

            const current = reader.current();
            await reader.seek(offset);
            const data = await reader.read(size);
            const actualSha1 = hashSha1(data);
            if (actualSha1 !== sha1) {
                console.error(`Hash mismatch: expected "${sha1}", got "${actualSha1}"`);
                process.exit(1);
            }
            segments.push([index, offset, size]);
            await reader.seek(current);
        }

        // let segment = segments[3];
        // let [_, offset, size] = segment;
        // await seek(offset);
        // while (reader.tell() < offset + size) {
        //     const folderNameHash = await readInt32();
        //     const filesOffset = await readInt32();
        //     const fileSize = await readInt32();
        //     const fileCount = fileSize / 16;
        //     await read(4);
        //     console.log(folderNameHash, filesOffset, fileSize, fileCount);
        // }

        const result = {};

        let segment = segments[0];
        let [index, offset, size] = segment;
        await reader.seek(offset);
        while (reader.current() < offset + size) {
            // const pos = reader.current();
            const fileNameHash = await reader.readInt32();
            const filePathHash = await reader.readInt32();
            const dataOffset = (await reader.readInt32()) * 0x8;
            await reader.read(4);
            result[filePathHash] = result[filePathHash] ?? {};
            result[filePathHash][fileNameHash] = result[filePathHash][fileNameHash] ?? [index, dataOffset];
            // console.log(pos, fileNameHash, filePathHash, dataOffset);
        }

        return result;
    }

    protected async decompressDataEntry(reader: Reader): Promise<Buffer> {
        // Header size
        await reader.readInt32();
        // Null
        await reader.readInt32();
        // Compressed length
        const compressedLength = await reader.readInt32();
        // Decompressed length
        await reader.readInt32();

        const data = await reader.read(compressedLength);
        return compressedLength === 32000 ? data : inflateRawSync(data);
    }

    protected async readDataEntry(reader: Reader, startPos: number) {
        // Header length
        const headerLength = await reader.readInt32();
        // Content type
        const contentType = await reader.readInt32();
        // Uncompressed size
        const uncompressedSize = await reader.readInt32();
        // Unknown
        const unknown = await reader.readInt32();
        // Block buffer size
        const blockBufferSize = await reader.readInt32();
        // Num blocks
        const numBlocks = await reader.readInt32();

        // console.log(startPos);
        // console.log(headerLength, contentType, uncompressedSize, unknown, blockBufferSize, numBlocks);

        switch (contentType) {
            case 1: // Placeholder
                reader.seek(startPos + headerLength);
                break;
            case 2: // Binary
                const blocks: Array<[number, number, number]> = [];
                for (let i = 0; i < numBlocks; i++) {
                    const offset = await reader.readInt32();
                    const blockSize = await reader.readInt16();
                    const decompressedDataSize = await reader.readInt16();
                    blocks.push([offset, blockSize, decompressedDataSize]);
                    // console.log(offset, blockSize, decompressedDataSize);
                }
                let binaryData: Buffer | undefined;
                for (const block of blocks) {
                    reader.seek(startPos + headerLength + block[0]);
                    binaryData =
                        binaryData == null
                            ? await this.decompressDataEntry(reader)
                            : Buffer.concat([binaryData, await this.decompressDataEntry(reader)]);
                }
                return binaryData;
            case 3: // Model
                for (let i = 0; i < numBlocks; i++) {
                    const unknown = await reader.readInt32();
                    const frameUncompressedChunk = await reader.read(44);
                    const frameSizeChunk = await reader.read(44);
                    const frameOffsetChunk = await reader.read(44);
                    const blockSizeIndexes = await reader.readInt16();
                    for (let j = 0; j < numBlocks; j++) {
                        const blockSizeTable = await reader.readInt16();
                    }
                }
                reader.seek(startPos + headerLength);
                break;
            case 4: // Texture
                const frames: Array<[number, number, number, number, number, number]> = [];
                for (let i = 0; i < numBlocks; i++) {
                    const frameOffset = await reader.readInt32();
                    const frameSize = await reader.readInt32();
                    const frameUncompressedSize = await reader.readInt32();
                    const frameBlocksizeOffset = await reader.readInt32();
                    const frameBlocksizeCount = await reader.readInt32();
                    const frameBlocksize = await reader.readInt16();
                    frames.push([
                        frameOffset,
                        frameSize,
                        frameUncompressedSize,
                        frameBlocksizeOffset,
                        frameBlocksizeCount,
                        frameBlocksize
                    ]);
                    // console.log(frameOffset, frameSize, frameUncompressedSize, frameBlocksizeOffset, frameBlocksizeCount, frameBlocksize);
                }
                reader.seek(startPos + headerLength);
                let textureData: Buffer | undefined;
                for (const frame of frames) {
                    const headerData = await reader.read(frame[0]);
                    textureData =
                        textureData == null
                            ? Buffer.concat([headerData, await this.decompressDataEntry(reader)])
                            : Buffer.concat([textureData, headerData, await this.decompressDataEntry(reader)]);
                }
                return textureData;
        }
    }

    protected async loadIndexData(): Promise<Record<string, Record<string, any>>> {
        const dataFile = this.getBruteForceDataFile();
        return fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile).toString()) : await this.readIndexFile();
    }

    protected saveIndexData(indexData: Record<string, Record<string, any>>): void {
        const dataFile = this.getBruteForceDataFile();
        fs.writeFileSync(dataFile, JSON.stringify(indexData, null, 2));
    }

    protected async extractRawDataByLocation(location: number): Promise<Buffer | null> {
        // TODO: Figure out which dat file to use
        const datFile = `${this.indexFile.substr(0, this.indexFile.lastIndexOf('.'))}.dat0`;
        if (!fs.existsSync(datFile)) {
            console.log(`"${datFile}" does not exist`);
            return null;
        }
        const reader = createReader(datFile);
        reader.seek(location);
        return await this.readDataEntry(reader, location);
    }

    protected async extractRawData(file: string, indexData?: any): Promise<Buffer | null> {
        indexData = indexData ?? (await this.readIndexFile());
        const [pathHash, fileHash] = this.splitFullPath(file).map(hashCrc32);
        const locationData = indexData[pathHash] && indexData[pathHash][fileHash];
        if (locationData == null) {
            console.log(`"${file}" is not found`);
            return null;
        }
        const data = await this.extractRawDataByLocation(locationData[1]);
        if (data == null) {
            console.log(`Can not extract "${file}"`);
            return null;
        }
        return data;
    }

    protected async *extractRawDataBatch(files: string[]) {
        const indexData = await this.readIndexFile();
        for (const file of files) {
            const data = await this.extractRawData(file, indexData);
            if (data == null) continue;
            yield { file, data };
        }
    }

    splitFullPath(fullPath: string): [string, string] {
        const paths = fullPath.split('/');
        if (paths.length < 2) throw new Error(`"${fullPath}" is not a valid path`);
        return [paths.slice(0, -1).join('/'), paths[paths.length - 1]];
    }

    async bruteForce(generator: AsyncGenerator<string>) {
        let found = false;
        const outputFile = this.getBruteForceResultFile();
        const indexData = await this.loadIndexData();
        for await (const fullPath of generator) {
            const [pathName, fileName] = this.splitFullPath(fullPath.toLowerCase());
            const pathCrc = hashCrc32(pathName);
            if (indexData[pathCrc]) {
                const fileCrc = hashCrc32(fileName);
                if (indexData[pathCrc][fileCrc]) {
                    fs.appendFileSync(outputFile, fullPath.toLowerCase() + EOL);
                    delete indexData[pathCrc][fileCrc];
                    if (Object.keys(indexData[pathCrc]).length === 0) delete indexData[pathCrc];
                    found = true;
                    console.log(fullPath);
                }
            }
        }

        if (!found) {
            console.log('Nothing found =(');
            return;
        }

        if (fs.existsSync(outputFile))
            fs.writeFileSync(
                outputFile,
                Array.from(new Set(fs.readFileSync(outputFile).toString().split(EOL)))
                    .filter(line => line.trim() !== '')
                    .sort()
                    .join(EOL) + EOL
            );
        this.saveIndexData(indexData);
    }

    generateSql(): void {
        const outputFile = this.getSqlFile();
        const append = (line: string) => fs.appendFileSync(outputFile, line + EOL);
        const types: Array<[string, string, Set<string>]> = [
            ['folders', 'path', new Set<string>()],
            ['filenames', 'name', new Set<string>()]
        ];
        for (const fullPath of fs.readFileSync(this.getBruteForceResultFile()).toString().split(EOL)) {
            if (fullPath.trim() === '') continue;
            const [pathName, fileName] = this.splitFullPath(fullPath);
            types[0][2].add(pathName);
            types[1][2].add(fileName);
        }
        if (fs.existsSync(outputFile)) fs.truncateSync(outputFile);
        append('BEGIN TRANSACTION;');
        for (const type of types) {
            append(`INSERT INTO "${type[0]}" ("hash", "${type[1]}", "used", "archive", "version") VALUES`);
            let counter = 0;
            for (const name of type[2]) {
                let indexType: string | number = Number(this.indexType);
                indexType = isNaN(indexType) ? `"${this.indexType}"` : indexType;
                append(
                    `(${hashCrc32Signed(name)}, "${name}", 0, ${indexType}, 8)${++counter === type[2].size ? ';' : ','}`
                );
                console.log(name);
            }
        }
        append('COMMIT;');
    }

    async extractRawFile(file: string): Promise<void> {
        const data = await this.extractRawData(file);
        if (data == null) return;

        const outputFile = path.normalize(path.join(extractDir, file));
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputFile, data);
        console.log(outputFile);
    }
}
