import React, { useState } from 'react';
import { VideoUpload } from './VideoUpload';
import { MetadataDisplay } from './MetadataDisplay';
import { ConversionOptionsForm } from './ConversionOptionsForm';
import { ConversionProgressBar } from './ConversionProgressBar';
import { DownloadSection } from './DownloadSection';
import { useVideoMetadata } from '../hooks/useVideoMetadata';
import { useFFmpeg } from '../hooks/useFFmpeg';
import type { ConversionOptions } from '../lib/types';
import { AlertTriangle, PlayCircle } from 'lucide-react';
// import { cn } from '../lib/utils';

export const ConverterContainer: React.FC = () => {
    const { metadata, extractMetadata, clearMetadata } = useVideoMetadata();
    const { status, progress, outputBlob, errorMessage, convert, cancel, reset: resetFFmpeg, setStatus } = useFFmpeg();

    const [options, setOptions] = useState<ConversionOptions>({
        maintainAspectRatio: true,
        quality: 'medium',
        format: 'mp4',
        stripAudio: false,
    });

    const handleFileSelect = async (file: File) => {
        try {
            const data = await extractMetadata(file);
            setOptions(prev => ({
                ...prev,
                width: data.width,
                height: data.height
            }));
            setStatus('file_selected');
        } catch (err) {
            console.error(err);
        }
    };

    /*
    const handleStartConversion = async () => {
        if (!metadata) return;

        // Check if original file is selected
        // Note: In a real app we'd need the File object here. 
        // We'll store it in a ref or local state.
    };
    */


    // We need to keep the file object between selection and conversion
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const onFileChange = (file: File) => {
        setSelectedFile(file);
        handleFileSelect(file);
    };

    const startConv = () => {
        if (selectedFile && metadata) {
            convert(selectedFile, options, metadata.duration);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        clearMetadata();
        resetFFmpeg();
        setOptions({
            maintainAspectRatio: true,
            quality: 'medium',
            format: 'mp4',
            stripAudio: false,
        });
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 overflow-hidden ring-1 ring-gray-900/5">
            <div className="p-6 md:p-10">
                {status === 'idle' && (
                    <VideoUpload onFileSelect={onFileChange} />
                )}

                {(status === 'file_selected' || status === 'error' || status === 'cancelled') && metadata && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid md:grid-cols-5 gap-8">
                            <div className="md:col-span-2">
                                <MetadataDisplay metadata={metadata} />
                            </div>
                            <div className="md:col-span-3">
                                <ConversionOptionsForm
                                    metadata={metadata}
                                    options={options}
                                    setOptions={setOptions}
                                    disabled={false}
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-medium">{errorMessage}</p>
                            </div>
                        )}

                        <button
                            onClick={startConv}
                            disabled={false}
                            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 disabled:bg-gray-400"
                        >
                            <PlayCircle className="w-6 h-6" />
                            CONVERTER AGORA
                        </button>

                        <button
                            onClick={handleReset}
                            className="w-full text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-gray-600 transition-colors"
                        >
                            Trocar vídeo
                        </button>
                    </div>
                )}

                {((status as any) === 'loading_ffmpeg' || status === 'converting') && (
                    <div className="py-12">
                        <ConversionProgressBar
                            progress={progress}
                            onCancel={cancel}
                            status={status}
                        />
                    </div>
                )}

                {status === 'done' && outputBlob && metadata && (
                    <DownloadSection
                        outputBlob={outputBlob}
                        onReset={handleReset}
                        fileName={metadata.name}
                    />
                )}
            </div>
        </div>
    );
};
