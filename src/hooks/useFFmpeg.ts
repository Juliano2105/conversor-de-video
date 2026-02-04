import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ConversionStatus, ConversionOptions, ConversionProgress } from '../lib/types';

const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

export const useFFmpeg = () => {
    const [status, setStatus] = useState<ConversionStatus>('idle');
    const [progress, setProgress] = useState<ConversionProgress>({ percentage: 0, timeElapsed: 0 });
    const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const startTimeRef = useRef<number>(0);

    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return ffmpegRef.current;

        setStatus('loading_ffmpeg');
        const ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg log:', message);
        });

        ffmpeg.on('progress', ({ progress: p }) => {
            // time is in microseconds
            const percentage = Math.round(p * 100);
            const elapsed = (Date.now() - startTimeRef.current) / 1000;

            setProgress({
                percentage,
                timeElapsed: elapsed,
                timeRemaining: percentage > 0 ? (elapsed / (percentage / 100)) - elapsed : undefined
            });
        });

        try {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            ffmpegRef.current = ffmpeg;
            return ffmpeg;
        } catch (err) {
            console.error('Failed to load FFmpeg:', err);
            setErrorMessage('Erro ao carregar o motor de conversão. Verifique sua conexão.');
            setStatus('error');
            throw err;
        }
    };

    const convert = async (file: File, options: ConversionOptions, duration: number) => {
        try {
            const ffmpeg = await loadFFmpeg();
            setStatus('converting');
            setProgress({ percentage: 0, timeElapsed: 0 });
            startTimeRef.current = Date.now();

            const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
            const outputName = options.format === 'mp4' ? 'output.mp4' : 'output.webm';

            await ffmpeg.writeFile(inputName, await fetchFile(file));

            const args: string[] = ['-i', inputName];

            // Bitrate calculation
            if (options.targetSizeMB && duration > 0) {
                const totalBitrateKbps = (options.targetSizeMB * 8192) / duration;
                const audioBitrate = options.stripAudio ? 0 : 128;
                const videoBitrate = Math.max(totalBitrateKbps - audioBitrate, 500);

                args.push('-b:v', `${Math.round(videoBitrate)}k`);
                if (!options.stripAudio) {
                    args.push('-b:a', '128k');
                }
            }

            // Resolution
            if (options.width && options.height) {
                args.push('-vf', `scale=${options.width}:${options.height}`);
            }

            // Quality (CRF) - if targetSize is not set, use quality
            if (!options.targetSizeMB) {
                const crfMap = { low: 30, medium: 23, high: 18 };
                args.push('-crf', crfMap[options.quality].toString());
            }

            // Video Codec
            if (options.format === 'mp4') {
                args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p');
            } else {
                args.push('-c:v', 'libvpx-vp9', '-deadline', 'realtime');
            }

            // Audio
            if (options.stripAudio) {
                args.push('-an');
            } else if (options.format === 'mp4') {
                args.push('-c:a', 'aac');
            }

            args.push(outputName);

            await ffmpeg.exec(args);

            if (status as string === 'cancelled') return;

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as any], { type: options.format === 'mp4' ? 'video/mp4' : 'video/webm' });

            setOutputBlob(blob);
            setStatus('done');

            // Cleanup FS
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (err) {
            if (status !== 'cancelled') {
                console.error('Conversion error details:', err);

                let msg = 'Ocorreu um erro durante a conversão.';
                const errorStr = String(err).toLowerCase();

                if (errorStr.includes('memory') || errorStr.includes('buffer') || file.size > 500 * 1024 * 1024) {
                    msg = 'Erro de memória: O arquivo é muito grande para o seu navegador processar. Tente um vídeo menor (abaixo de 500MB).';
                } else if (errorStr.includes('exec')) {
                    msg = 'Erro no processamento do vídeo. Tente mudar as configurações de saída.';
                }

                setErrorMessage(msg);
                setStatus('error');
            }
        }
    };

    const cancel = useCallback(async () => {
        if (ffmpegRef.current) {
            try {
                // In @ffmpeg/ffmpeg v0.12, terminating is the way to cancel
                ffmpegRef.current.terminate();
                ffmpegRef.current = null;
                setStatus('cancelled');
            } catch (err) {
                console.error('Cancel error:', err);
            }
        }
    }, []);

    const reset = useCallback(() => {
        setStatus('idle');
        setProgress({ percentage: 0, timeElapsed: 0 });
        setOutputBlob(null);
        setErrorMessage(null);
    }, []);

    return { status, progress, outputBlob, errorMessage, convert, cancel, reset, setStatus };
};
