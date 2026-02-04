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
        let strategyLines: string[] = [];
        try {
            const ffmpeg = await loadFFmpeg();
            setStatus('converting');
            setProgress({ percentage: 0, timeElapsed: 0, appliedStrategy: 'Calculando melhor estratégia...' });
            startTimeRef.current = Date.now();

            const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.mp4');
            const outputName = options.format === 'mp4' ? 'output.mp4' : 'output.webm';

            await ffmpeg.writeFile(inputName, await fetchFile(file));

            const args: string[] = ['-i', inputName];

            // --- STRATEGY CALCULATION ---
            let targetVideoBitrate = 0;
            let targetAudioBitrate = options.stripAudio ? 0 : 128;
            let targetFps = 30;
            let targetWidth = options.width || 1280;
            let targetHeight = options.height || 720;

            if (options.targetSizeMB && duration > 0) {
                const totalTargetBitrateKbps = (options.targetSizeMB * 8192) / duration;

                // Reserve audio (fallback to 96 if extremely tight)
                if (totalTargetBitrateKbps < 200 && !options.stripAudio) {
                    targetAudioBitrate = 96;
                    strategyLines.push('Áudio reduzido para 96kbps');
                }

                targetVideoBitrate = Math.max(totalTargetBitrateKbps - targetAudioBitrate, 300);

                // --- AUTO RESOLUTION REDUCTION ---
                // Heuristic: check pieces of bitrate relative to pixels
                const calculateBpp = (bv: number, w: number, h: number, f: number) => (bv * 1000) / (w * h * f);

                let bpp = calculateBpp(targetVideoBitrate, targetWidth, targetHeight, targetFps);

                if (bpp < 0.06) {
                    // Stage 1: 1080 -> 720
                    if (targetWidth > 1280 || targetHeight > 1280) {
                        const ratio = targetWidth / targetHeight;
                        if (targetWidth > targetHeight) {
                            targetWidth = 1280;
                            targetHeight = Math.round(1280 / ratio);
                        } else {
                            targetHeight = 1280;
                            targetWidth = Math.round(1280 * ratio);
                        }
                        strategyLines.push('Resolução: 720p');
                    }

                    bpp = calculateBpp(targetVideoBitrate, targetWidth, targetHeight, targetFps);
                    // Stage 2: 720 -> 540
                    if (bpp < 0.05) {
                        targetWidth = Math.round(targetWidth * 0.75);
                        targetHeight = Math.round(targetHeight * 0.75);
                        strategyLines.push('Resolução: 540p');
                    }

                    bpp = calculateBpp(targetVideoBitrate, targetWidth, targetHeight, targetFps);
                    // Stage 3: Reduce FPS
                    if (bpp < 0.04) {
                        targetFps = 24;
                        strategyLines.push('FPS: 24');
                    }

                    bpp = calculateBpp(targetVideoBitrate, targetWidth, targetHeight, targetFps);
                    // Stage 4: 540 -> 480
                    if (bpp < 0.04) {
                        targetWidth = Math.round(targetWidth * 0.8);
                        targetHeight = Math.round(targetHeight * 0.8);
                        strategyLines.push('Resolução: 480p');
                    }
                }

                args.push('-b:v', `${Math.round(targetVideoBitrate)}k`);
                if (!options.stripAudio) {
                    args.push('-b:a', `${targetAudioBitrate}k`);
                }
            } else {
                // No target size, use CRF
                const crfMap = { low: 32, medium: 26, high: 21 }; // Slightly more aggressive for browser
                args.push('-crf', crfMap[options.quality].toString());
            }

            // Apply calculated resolution and fps
            // Use -vf "scale=W:H,fps=F"
            // Ensure even numbers for x264
            const finalW = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
            const finalH = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
            args.push('-vf', `scale=${finalW}:${finalH},fps=${targetFps}`);

            // Video Codec
            if (options.format === 'mp4') {
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
            } else {
                args.push('-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8');
            }

            // Audio
            if (targetAudioBitrate === 0) {
                args.push('-an');
            } else if (options.format === 'mp4') {
                args.push('-c:a', 'aac');
            }

            args.push(outputName);

            const currentStrategy = strategyLines.length > 0 ? `Estratégia: ${strategyLines.join(', ')}` : 'Estratégia: Qualidade padrão otimizada';
            setProgress(prev => ({ ...prev, appliedStrategy: currentStrategy }));

            // EXECUTE
            await ffmpeg.exec(args);

            if (status as string === 'cancelled') return;

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as any], { type: options.format === 'mp4' ? 'video/mp4' : 'video/webm' });

            setOutputBlob(blob);
            setStatus('done');

            // Cleanup
            try {
                await ffmpeg.deleteFile(inputName);
                await ffmpeg.deleteFile(outputName);
            } catch (e) {
                console.warn('Cleanup warning:', e);
            }

        } catch (err) {
            if (status !== 'cancelled') {
                console.error('Conversion details:', err);

                // DEEP CLEANUP ON ERROR
                if (ffmpegRef.current) {
                    try {
                        const files = await ffmpegRef.current.listDir('/');
                        for (const f of files) {
                            if (!f.isDir) await ffmpegRef.current.deleteFile(f.name);
                        }
                    } catch (cleanupErr) {
                        console.error('Final cleanup failed:', cleanupErr);
                    }
                }

                let msg = 'Ocorreu um erro durante a conversão.';
                const errorStr = String(err).toLowerCase();

                if (errorStr.includes('memory') || errorStr.includes('buffer') || file.size > 500 * 1024 * 1024) {
                    msg = 'Seu navegador não conseguiu processar esse arquivo com essas configurações. Tente novamente com uma resolução menor ou tamanho alvo maior.';
                }

                setErrorMessage(msg);
                setStatus('error');
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
    }, []);

    return { status, progress, outputBlob, errorMessage, convert, cancel, reset, setStatus };
};

return { status, progress, outputBlob, errorMessage, convert, cancel, reset, setStatus };
};
