import { useState, useRef, useCallback } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { ConversionStatus, ConversionOptions, ConversionProgress } from '../lib/types';

// Use stable absolute CDN URLs
const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';
const WASM_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';

export const useFFmpeg = () => {
    const [status, setStatus] = useState<ConversionStatus>('idle');
    const [progress, setProgress] = useState<ConversionProgress>({
        percentage: 0,
        timeElapsed: 0,
        isIsolated: typeof window !== 'undefined' ? window.crossOriginIsolated : false,
        debugLog: []
    });
    const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const startTimeRef = useRef<number>(0);
    const logsRef = useRef<string[]>([]);

    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return ffmpegRef.current;

        if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
            console.warn('Ambiente não isolado (COOP/COEP faltando). FFmpeg pode falhar.');
        }

        try {
            // Dynamic import for browser-only FFmpeg
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { toBlobURL } = await import('@ffmpeg/util');

            setStatus('loading_ffmpeg');
            const ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg log:', message);
                logsRef.current = [...logsRef.current.slice(-19), message];
                setProgress(prev => ({ ...prev, debugLog: logsRef.current }));
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
            setErrorMessage('Erro ao carregar o motor de conversão (FFmpeg Load Failure). Verifique se os cabeçalhos COOP/COEP estão ativos.');
            setStatus('error');
            throw err;
        }
    };

    const convert = async (file: File, options: ConversionOptions, duration: number) => {
        const hasTargetSize = options.targetSizeMB && options.targetSizeMB > 0;

        // Define progressive attempts ONLY if we have a target size
        const attempts = hasTargetSize
            ? [
                { id: 1, label: 'Otimizando qualidade...' },
                { id: 2, label: 'Ajustando fluidez (FPS: 20)' },
                { id: 3, label: 'Reduzindo impacto visual (30% menor)' },
                { id: 4, label: 'Modo de Segurança: Removendo áudio' },
                { id: 5, label: 'Modo Crítico: Resolução mínima (360p)' }
            ]
            : [{ id: 1, label: 'Convertendo com Qualidade Visual' }];

        for (const attempt of attempts) {
            if (status as string === 'cancelled') break;

            try {
                // Ensure fresh state for each attempt
                if (ffmpegRef.current) {
                    try { ffmpegRef.current.terminate(); } catch (e) { }
                    ffmpegRef.current = null;
                }

                const ffmpeg = await loadFFmpeg();
                setStatus('converting');
                startTimeRef.current = Date.now();

                const inputExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase() || '.mp4';
                const inputName = `input${inputExt}`;
                const outputName = 'output.mp4';

                const { fetchFile } = await import('@ffmpeg/util');

                // Progress report
                setProgress(prev => ({
                    ...prev,
                    percentage: 0,
                    appliedStrategy: hasTargetSize
                        ? `Preparando arquivo... (Tentativa ${attempt.id}/5)`
                        : 'Preparando conversão local...'
                }));

                await ffmpeg.writeFile(inputName, await fetchFile(file));

                const args: string[] = ['-i', inputName];

                // MOV/MP4 optimization headers
                args.push('-movflags', '+faststart');
                if (inputExt === '.mov') {
                    args.splice(1, 0, '-fflags', '+genpts');
                }

                // --- PATH A: BITRATE (TARGET SIZE DEFINED) ---
                if (hasTargetSize) {
                    let targetAudioBitrate = options.stripAudio || attempt.id >= 4 ? 0 : 96;
                    let targetFps = attempt.id >= 2 ? 20 : 24;
                    let targetWidth = options.width || 1280;
                    let targetHeight = options.height || 720;

                    if (attempt.id === 3) {
                        targetWidth = Math.round(targetWidth * 0.7);
                        targetHeight = Math.round(targetHeight * 0.7);
                    } else if (attempt.id >= 5) {
                        const ratio = targetWidth / targetHeight;
                        if (targetWidth > targetHeight) {
                            targetWidth = 640;
                            targetHeight = Math.round(640 / ratio);
                        } else {
                            targetHeight = 640;
                            targetWidth = Math.round(640 * ratio);
                        }
                    }

                    const totalTargetBitrateKbps = (options.targetSizeMB! * 8192) / duration;
                    const targetVideoBitrate = Math.max(totalTargetBitrateKbps - targetAudioBitrate, 250);

                    args.push('-b:v', `${Math.round(targetVideoBitrate)}k`);
                    if (targetAudioBitrate > 0) args.push('-b:a', `${targetAudioBitrate}k`);

                    const finalW = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
                    const finalH = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
                    args.push('-vf', `scale=${finalW}:${finalH},fps=${targetFps}`);
                }
                // --- PATH B: CRF (NO TARGET SIZE) ---
                else {
                    const crfValues = { low: 28, medium: 23, high: 18 };
                    args.push('-crf', crfValues[options.quality].toString());

                    // Maintain resolution/fps if possible, or just use scale filter for even dims
                    const w = options.width || 1280;
                    const h = options.height || 720;
                    const finalW = w % 2 === 0 ? w : w - 1;
                    const finalH = h % 2 === 0 ? h : h - 1;
                    args.push('-vf', `scale=${finalW}:${finalH}`);
                }

                // Common settings
                args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p');

                if (options.stripAudio || (hasTargetSize && attempt.id >= 4)) {
                    args.push('-an');
                } else {
                    args.push('-c:a', 'aac');
                }

                args.push(outputName);

                setProgress(prev => ({
                    ...prev,
                    appliedStrategy: hasTargetSize ? `Processando: ${attempt.label}` : 'Estratégia: Alta Qualidade Local'
                }));

                await ffmpeg.exec(args);

                if (status as string === 'cancelled') return;

                const data = await ffmpeg.readFile(outputName);
                const blob = new Blob([data as any], { type: 'video/mp4' });

                setOutputBlob(blob);
                setStatus('done');

                try {
                    await ffmpeg.deleteFile(inputName);
                    await ffmpeg.deleteFile(outputName);
                } catch (e) { }
                return;

            } catch (err) {
                console.error(`Conversion ${hasTargetSize ? 'Attempt ' + attempt.id : ''} Error:`, err);

                if (ffmpegRef.current) {
                    try { ffmpegRef.current.terminate(); } catch (e) { }
                    ffmpegRef.current = null;
                }

                if (!hasTargetSize || attempt.id === 5) {
                    const baseMsg = hasTargetSize
                        ? 'Seu navegador não conseguiu processar com esse tamanho alvo agressivo.'
                        : 'Ocorreu um erro inesperado durante a conversão local.';

                    setErrorMessage(`${baseMsg} Verifique o log de debug abaixo para mais detalhes.`);
                    setStatus('error');
                    break;
                } else {
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
