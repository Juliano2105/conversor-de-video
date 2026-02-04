import { useState, useRef, useCallback } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { ConversionStatus, ConversionOptions, ConversionProgress } from '../lib/types';

// Use stable absolute CDN URLs
const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';
const WASM_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';

export const useFFmpeg = () => {
    const [status, setStatus] = useState<ConversionStatus>('idle');
    const [progress, setProgress] = useState<ConversionProgress>({ percentage: 0, timeElapsed: 0 });
    const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const startTimeRef = useRef<number>(0);

    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return ffmpegRef.current;

        try {
            // Dynamic import for browser-only FFmpeg
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { toBlobURL } = await import('@ffmpeg/util');

            setStatus('loading_ffmpeg');
            const ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg log:', message);
            });

            ffmpeg.on('progress', ({ progress: p }) => {
                const percentage = Math.round(p * 100);
                const elapsed = (Date.now() - startTimeRef.current) / 1000;

                setProgress(prev => ({
                    ...prev,
                    percentage,
                    timeElapsed: elapsed,
                    timeRemaining: percentage > 0 ? (elapsed / (percentage / 100)) - elapsed : undefined
                }));
            });

            await ffmpeg.load({
                coreURL: await toBlobURL(CORE_URL, 'text/javascript'),
                wasmURL: await toBlobURL(WASM_URL, 'application/wasm'),
            });

            ffmpegRef.current = ffmpeg;
            return ffmpeg;
        } catch (err) {
            console.error('FFmpeg Load Error:', err);
            setErrorMessage('Erro ao carregar o motor de conversão (FFmpeg Load Failure).');
            setStatus('error');
            throw err;
        }
    };

    const convert = async (file: File, options: ConversionOptions, duration: number) => {
        const attempts = [
            { id: 1, label: 'Otimizando qualidade e bitrate...' },
            { id: 2, label: 'Ajustando taxa de quadros (FPS: 20)' },
            { id: 3, label: 'Reduzindo resolução para economia de memória' },
            { id: 4, label: 'Modo de Emergência: Removendo áudio' }
        ];

        for (const attempt of attempts) {
            if (status as string === 'cancelled') break;

            try {
                // FORCE FRESH WORKER for each retry attempt
                if (ffmpegRef.current) {
                    try { ffmpegRef.current.terminate(); } catch (e) { }
                    ffmpegRef.current = null;
                }

                // Load engine
                const ffmpeg = await loadFFmpeg();
                setStatus('converting');
                startTimeRef.current = Date.now();

                const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.mp4');
                const outputName = 'output.mp4';

                const { fetchFile } = await import('@ffmpeg/util');
                await ffmpeg.writeFile(inputName, await fetchFile(file));

                const args: string[] = ['-i', inputName];

                // --- STRATEGY CALCULATION ---
                let targetVideoBitrate = 0;
                let targetAudioBitrate = options.stripAudio || attempt.id === 4 ? 0 : 96;
                let targetFps = attempt.id >= 2 ? 20 : 24;
                let targetWidth = options.width || 1280;
                let targetHeight = options.height || 720;

                // Scale down on Attempt 3
                if (attempt.id >= 3) {
                    targetWidth = Math.round(targetWidth * 0.7);
                    targetHeight = Math.round(targetHeight * 0.7);
                }

                if (options.targetSizeMB && duration > 0) {
                    const totalTargetBitrateKbps = (options.targetSizeMB * 8192) / duration;
                    targetVideoBitrate = Math.max(totalTargetBitrateKbps - targetAudioBitrate, 300);
                    args.push('-b:v', `${Math.round(targetVideoBitrate)}k`);
                    if (targetAudioBitrate > 0) {
                        args.push('-b:a', `${targetAudioBitrate}k`);
                    }
                } else {
                    const crfMap = { low: 32, medium: 26, high: 21 };
                    args.push('-crf', crfMap[options.quality].toString());
                }

                // Res + FPS
                const finalW = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
                const finalH = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
                args.push('-vf', `scale=${finalW}:${finalH},fps=${targetFps}`);

                // Codec for max compatibility
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');

                if (targetAudioBitrate === 0) {
                    args.push('-an');
                } else {
                    args.push('-c:a', 'aac');
                }

                args.push(outputName);

                setProgress(prev => ({
                    ...prev,
                    appliedStrategy: `Tentativa ${attempt.id}/4: ${attempt.label}`
                }));

                // EXECUTE
                await ffmpeg.exec(args);

                if (status as string === 'cancelled') return;

                const data = await ffmpeg.readFile(outputName);
                const blob = new Blob([data as any], { type: 'video/mp4' });

                setOutputBlob(blob);
                setStatus('done');

                // Cleanup
                try {
                    await ffmpeg.deleteFile(inputName);
                    await ffmpeg.deleteFile(outputName);
                } catch (e) { }
                return; // SUCCESS

            } catch (err) {
                console.error(`Attempt ${attempt.id} Failed:`, err);

                // If last attempt failed, show final error
                if (attempt.id === 4) {
                    setErrorMessage('Seu navegador não conseguiu converter com esse tamanho alvo. Tente aumentar o tamanho alvo ou reduzir a resolução manualmente.');
                    setStatus('error');
                } else {
                    // Small delay before retry
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
        }
    };

    const cancel = useCallback(async () => {
        if (ffmpegRef.current) {
            try {
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
        if (ffmpegRef.current) {
            try { ffmpegRef.current.terminate(); } catch (e) { }
            ffmpegRef.current = null;
        }
    }, []);

    return { status, progress, outputBlob, errorMessage, convert, cancel, reset, setStatus };
};
