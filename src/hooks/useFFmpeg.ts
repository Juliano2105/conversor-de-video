import { useState, useRef, useCallback } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
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
        // Define progressive attempts
        const attempts = [
            { id: 1, label: 'Otimizando qualidade...' },
            { id: 2, label: 'Reduzindo taxa de quadros (FPS: 20)' },
            { id: 3, label: 'Reduzindo resolução (30% menor)' },
            { id: 4, label: 'Removendo áudio (Modo Emergência)' }
        ];

        for (const attempt of attempts) {
            // Check for explicit cancellation
            if (status as string === 'cancelled') break;

            try {
                // RECREATE WORKER for each attempt to ensure fresh memory state
                if (ffmpegRef.current) {
                    try { ffmpegRef.current.terminate(); } catch (e) { }
                    ffmpegRef.current = null;
                }

                const ffmpeg = await loadFFmpeg();
                setStatus('converting');
                startTimeRef.current = Date.now();

                const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.mp4');
                const outputName = 'output.mp4'; // Always MP4 for best compatibility

                const { fetchFile } = await import('@ffmpeg/util');
                await ffmpeg.writeFile(inputName, await fetchFile(file));

                const args: string[] = ['-i', inputName];

                // --- STRATEGY CALCULATION PER ATTEMPT ---
                let targetVideoBitrate = 0;
                let targetAudioBitrate = options.stripAudio || attempt.id === 4 ? 0 : 96;
                let targetFps = attempt.id >= 2 ? 20 : 24;
                let targetWidth = options.width || 1280;
                let targetHeight = options.height || 720;

                // Adjust resolution on Attempt 3
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

                // Resolution and FPS (Ensure even dimensions for libx264)
                const finalW = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
                const finalH = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
                args.push('-vf', `scale=${finalW}:${finalH},fps=${targetFps}`);

                // Codec and Presets (Forced for maximum compatibility and speed in browser)
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');

                // Audio codec
                if (targetAudioBitrate === 0) {
                    args.push('-an');
                } else {
                    args.push('-c:a', 'aac');
                }

                args.push(outputName);

                // Update specific strategy reporting
                setProgress(prev => ({
                    ...prev,
                    appliedStrategy: `Tentativa ${attempt.id}/4: ${attempt.label}`
                }));

                // EXECUTE conversion
                await ffmpeg.exec(args);

                // If execution finishes, check if we weren't cancelled mid-way
                if (status as string === 'cancelled') return;

                const data = await ffmpeg.readFile(outputName);
                const blob = new Blob([data as any], { type: 'video/mp4' });

                setOutputBlob(blob);
                setStatus('done');

                // Cleanup and Exit loop
                try {
                    await ffmpeg.deleteFile(inputName);
                    await ffmpeg.deleteFile(outputName);
                } catch (e) { }
                return;

            } catch (err) {
                console.error(`Attempt ${attempt.id} failed:`, err);

                // If it's the last attempt and it failed, show final error
                if (attempt.id === 4) {
                    const errorStr = String(err).toLowerCase();
                    let msg = 'Seu navegador não conseguiu processar esse arquivo. Tente novamente com uma resolução menor ou tamanho alvo maior.';
                    if (errorStr.includes('memory') || errorStr.includes('buffer')) {
                        msg = 'Erro de Memória: Arquivo muito grande para o seu navegador. Tente fechar outras abas ou usar um tamanho alvo maior.';
                    }
                    setErrorMessage(msg);
                    setStatus('error');
                } else {
                    // Small delay to allow browser to breath before next try
                    await new Promise(r => setTimeout(r, 1000));
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
