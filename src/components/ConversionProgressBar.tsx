import React from 'react';
import type { ConversionProgress } from '../lib/types';
import { XCircle, Loader2 } from 'lucide-react';

interface ConversionProgressBarProps {
    progress: ConversionProgress;
    onCancel: () => void;
    status: string;
}

export const ConversionProgressBar: React.FC<ConversionProgressBarProps> = ({ progress, onCancel, status }) => {
    const formatTime = (seconds?: number) => {
        if (seconds === undefined || isNaN(seconds) || !isFinite(seconds)) return '--:--';
        const s = Math.round(seconds);
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="animate-spin text-indigo-600">
                        <Loader2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">
                            {status === 'loading_ffmpeg' ? 'Carregando motor...' : 'Convertendo seu vídeo...'}
                        </h3>
                        <p className="text-xs text-gray-500">Isso pode levar alguns minutos dependendo do tamanho.</p>
                    </div>
                </div>

                <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                    <XCircle className="w-4 h-4" />
                    CANCELAR
                </button>
            </div>

            <div className="space-y-2">
                <div className="bg-gray-100 h-4 w-full rounded-full overflow-hidden border border-gray-200 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out relative"
                        style={{ width: `${progress.percentage}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    <span>{progress.percentage}% Concluído</span>
                    <div className="flex gap-4">
                        <span>Decorrido: {formatTime(progress.timeElapsed)}</span>
                        {progress.timeRemaining !== undefined && (
                            <span>Restante: ~{formatTime(progress.timeRemaining)}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
