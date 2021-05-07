import ArchiveUI from './ArchiveUI';

const sqpackDir = 'D:\\Games\\最终幻想XIV\\game\\sqpack';
const archive = new ArchiveUI(sqpackDir);
(async () => {
    // archive.bruteForce(archive.bruteForce_LoadingImages());
    await archive.extractRaw('ui/icon/000000/000000.tex');
})();
