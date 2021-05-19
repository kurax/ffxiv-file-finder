import { Reader } from './reader';

export interface MTRLData {
    colorDataSize: number;
}

export async function GetMTRLDataFromReader(reader: Reader): Promise<MTRLData | undefined> {
    const signature = await reader.readInt32();
    if (signature !== 16973824) {
        await reader.seekRelative(-4);
        return;
    }

    // Unknown
    await reader.readInt16();
    // Color-data size
    const colorDataSize = await reader.readInt16();

    return {
        colorDataSize
    };
}
