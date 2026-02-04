export type ConversionStatus =
    | 'idle'
    | 'file_selected'
    | 'loading_ffmpeg'
    | 'converting'
    | 'cancelled'
    | 'done'
    | 'error';

export interface ConversionOptions {
    targetSizeMB?: number;
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
    quality: 'low' | 'medium' | 'high';
    format: 'mp4' | 'webm';
    stripAudio: boolean;
}

export interface ConversionProgress {
    percentage: number;
    timeElapsed: number;
    timeRemaining?: number;
}
