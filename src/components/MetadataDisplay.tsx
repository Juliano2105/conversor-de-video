import React from 'react';
import type { VideoMetadata } from '../hooks/useVideoMetadata';
import { Clock, Maximize, FileType, HardDrive } from 'lucide-react';

interface MetadataDisplayProps {
    metadata: VideoMetadata;
}

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ metadata }) => {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Metadados do Vídeo</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-md text-indigo-600">
                        <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">Tamanho</p>
                        <p className="text-sm font-bold text-gray-900">{formatSize(metadata.size)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-md text-indigo-600">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">Duração</p>
                        <p className="text-sm font-bold text-gray-900">{formatDuration(metadata.duration)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-md text-indigo-600">
                        <Maximize className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">Resolução</p>
                        <p className="text-sm font-bold text-gray-900">{metadata.width}x{metadata.height}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-md text-indigo-600">
                        <FileType className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">Formato</p>
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[80px]">{metadata.type.split('/')[1]?.toUpperCase() || 'VIDEO'}</p>
                    </div>
                </div>
            </div>

            <div className="px-1 truncate">
                <p className="text-xs text-gray-400 font-medium truncate">Arquivo: <span className="text-gray-600">{metadata.name}</span></p>
            </div>

            {metadata.size > 500 * 1024 * 1024 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-700 leading-tight">
                    <p className="font-bold flex items-center gap-1 mb-1">
                        ⚠️ Arquivo Grande
                    </p>
                    Navegadores têm limites de memória. Se a conversão falhar, tente um vídeo menor que 500MB.
                </div>
            )}
        </div>
    );
};
