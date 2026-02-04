import React, { useState } from 'react';
import type { ConversionOptions } from '../lib/types';
import type { VideoMetadata } from '../hooks/useVideoMetadata';
import { Settings, Sliders, Smartphone, Instagram, Youtube, Layout } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConversionOptionsFormProps {
    metadata: VideoMetadata;
    options: ConversionOptions;
    setOptions: React.Dispatch<React.SetStateAction<ConversionOptions>>;
    disabled?: boolean;
}

export const ConversionOptionsForm: React.FC<ConversionOptionsFormProps> = ({ metadata, options, setOptions, disabled }) => {
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const applyPreset = (preset: string) => {
        setActivePreset(preset);
        switch (preset) {
            case 'whatsapp':
                setOptions(prev => ({
                    ...prev,
                    width: metadata.aspectRatio < 1 ? 480 : 854,
                    height: metadata.aspectRatio < 1 ? 854 : 480,
                    quality: 'medium',
                    targetSizeMB: 16 // WhatsApp limit for many versions
                }));
                break;
            case 'instagram-stories':
                setOptions(prev => ({
                    ...prev,
                    width: 1080,
                    height: 1920,
                    maintainAspectRatio: false
                }));
                break;
            case 'reels':
                setOptions(prev => ({
                    ...prev,
                    width: 1080,
                    height: 1920,
                    maintainAspectRatio: false
                }));
                break;
            case 'youtube-1080p':
                setOptions(prev => ({
                    ...prev,
                    width: 1920,
                    height: 1080,
                    maintainAspectRatio: false
                }));
                break;
        }
    };

    const handleWidthChange = (val: number) => {
        if (options.maintainAspectRatio) {
            setOptions(prev => ({
                ...prev,
                width: val,
                height: Math.round(val / metadata.aspectRatio)
            }));
        } else {
            setOptions(prev => ({ ...prev, width: val }));
        }
        setActivePreset(null);
    };

    const handleHeightChange = (val: number) => {
        if (options.maintainAspectRatio) {
            setOptions(prev => ({
                ...prev,
                height: val,
                width: Math.round(val * metadata.aspectRatio)
            }));
        } else {
            setOptions(prev => ({ ...prev, height: val }));
        }
        setActivePreset(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-gray-900 border-b border-gray-100 pb-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold">Configurações de Saída</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
                    { id: 'instagram-stories', label: 'Stories', icon: Instagram },
                    { id: 'reels', label: 'Reels', icon: Layout },
                    { id: 'youtube-1080p', label: 'YouTube', icon: Youtube },
                    { id: 'custom', label: 'Manual', icon: Sliders },
                ].map((p) => {
                    const Icon = p.icon;

                    return (
                        <button
                            key={p.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => applyPreset(p.id)}
                            className={cn(
                                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium",
                                activePreset === p.id
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/30"
                            )}
                        >
                            <Icon className="w-5 h-5 mb-0.5" />
                            {p.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resolução (Largura x Altura)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={options.width || ''}
                                onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                                disabled={disabled}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                placeholder="Largura"
                            />
                            <span className="text-gray-400">×</span>
                            <input
                                type="number"
                                value={options.height || ''}
                                onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                                disabled={disabled}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                placeholder="Altura"
                            />
                        </div>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.maintainAspectRatio}
                                onChange={(e) => setOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                                disabled={disabled}
                                className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 pointer-events-auto"
                            />
                            <span className="text-xs text-gray-500 font-medium">Manter proporção</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tamanho Alvo (MB) - Opcional</label>
                        <input
                            type="number"
                            value={options.targetSizeMB || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, targetSizeMB: parseFloat(e.target.value) }))}
                            disabled={disabled}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            placeholder="Ex: 10"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            O sistema tentará ajustar o bitrate para atingir este tamanho.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Qualidade Visual</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as const).map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    disabled={disabled || !!options.targetSizeMB}
                                    onClick={() => setOptions(prev => ({ ...prev, quality: q }))}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-xs font-bold border transition-all uppercase tracking-wide",
                                        options.quality === q
                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                            : "border-gray-200 bg-white text-gray-500 hover:border-indigo-200",
                                        options.targetSizeMB && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {q === 'low' ? 'Baixa' : q === 'medium' ? 'Média' : 'Alta'}
                                </button>
                            ))}
                        </div>
                        {options.targetSizeMB && (
                            <p className="text-[10px] text-amber-600 mt-1 font-medium">
                                *Ignorado ao definir tamanho alvo.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Formato</label>
                            <select
                                value={options.format}
                                onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as 'mp4' | 'webm' }))}
                                disabled={disabled}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="mp4">MP4 (H.264)</option>
                                <option value="webm">WebM (VP9)</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Áudio</label>
                            <select
                                value={options.stripAudio ? 'remove' : 'keep'}
                                onChange={(e) => setOptions(prev => ({ ...prev, stripAudio: e.target.value === 'remove' }))}
                                disabled={disabled}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="keep">Manter Áudio</option>
                                <option value="remove">Remover Áudio</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
