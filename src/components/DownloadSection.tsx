import React from 'react';
import { Download, CheckCircle2, RefreshCcw, HardDrive } from 'lucide-react';

interface DownloadSectionProps {
    outputBlob: Blob;
    onReset: () => void;
    fileName: string;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ outputBlob, onReset, fileName }) => {
    const downloadUrl = URL.createObjectURL(outputBlob);

    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return mb.toFixed(2) + ' MB';
    };

    const extension = outputBlob.type.includes('webm') ? 'webm' : 'mp4';
    const downloadName = fileName.replace(/\.[^/.]+$/, "") + `_convertido.${extension}`;

    return (
        <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
            <div className="text-center px-4 py-8 bg-green-50 rounded-2xl border border-green-100">
                <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full text-green-600 mb-4 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-green-900">Vídeo pronto!</h3>
                <p className="text-green-700 text-sm mt-1">Sua conversão foi concluída com sucesso localmente.</p>

                <div className="mt-6 flex items-center justify-center gap-2 text-indigo-900 bg-white/50 py-2 px-4 rounded-full inline-block mx-auto border border-white">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm font-bold">Novo tamanho: {formatSize(outputBlob.size)}</span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <a
                    href={downloadUrl}
                    download={downloadName}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                    <Download className="w-5 h-5" />
                    BAIXAR VÍDEO
                </a>

                <button
                    onClick={onReset}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-6 py-4 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                    <RefreshCcw className="w-5 h-5" />
                    CONVERTER OUTRO
                </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                Lembre-se: O arquivo será perdido se você recarregar a página sem baixar.
            </p>
        </div>
    );
};
