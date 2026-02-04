import React, { useRef, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoUploadProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onFileSelect, disabled }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            onFileSelect(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('video/')) {
            onFileSelect(file);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 text-center group",
                isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50",
                disabled && "opacity-50 cursor-not-allowed grayscale"
            )}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
                disabled={disabled}
            />

            <div className="flex flex-col items-center gap-4">
                <div className={cn(
                    "p-4 rounded-full bg-indigo-50 text-indigo-600 transition-transform duration-300 group-hover:scale-110",
                    isDragging && "scale-110 rotate-12"
                )}>
                    <Upload className="w-8 h-8" />
                </div>

                <div>
                    <p className="text-lg font-semibold text-gray-900">
                        {isDragging ? "Solte o vídeo aqui" : "Selecione um vídeo para começar"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Arraste e solte ou clique para navegar
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 disabled:bg-gray-400"
                >
                    Escolher Arquivo
                </button>

                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                    <FileVideo className="w-3 h-3" />
                    <span>Formatos suportados: MP4, WebM, MOV, MKV</span>
                </div>
            </div>

            {!disabled && (
                <div className="mt-6 flex items-start gap-2 text-left p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 leading-tight">
                        Arquivos muito grandes podem demorar e exigir mais memória do seu dispositivo.
                        Recomendamos vídeos até 500MB para melhor performance.
                    </p>
                </div>
            )}
        </div>
    );
};
