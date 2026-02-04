import { useState, useCallback } from 'react';

export interface VideoMetadata {
    name: string;
    size: number;
    type: string;
    duration: number; // in seconds
    width: number;
    height: number;
    aspectRatio: number;
}

export const useVideoMetadata = () => {
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);

    const extractMetadata = useCallback((file: File) => {
        return new Promise<VideoMetadata>((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                const data: VideoMetadata = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    aspectRatio: video.videoWidth / video.videoHeight,
                };
                setMetadata(data);
                resolve(data);
            };
            video.onerror = () => {
                setError('Não foi possível ler os metadados do vídeo.');
                reject('Invalid video file');
            };
            video.src = URL.createObjectURL(file);
        });
    }, []);

    const clearMetadata = useCallback(() => {
        setMetadata(null);
        setError(null);
    }, []);

    return { metadata, error, extractMetadata, clearMetadata };
};
