import React from 'react';
import { ShieldCheck, Zap, Info, PlayCircle } from 'lucide-react';

export const HelpPage: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-gray-900">Como funciona o Conversor?</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Toda a mágica acontece no seu navegador usando tecnologia de ponta para garantir sua privacidade e velocidade.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                        <h3 className="font-bold text-lg">Privacidade Total</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Diferente de outros sites, nós não fazemos upload do seu vídeo. A conversão ocorre diretamente no processador do seu computador. Seus dados nunca saem do seu dispositivo.
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-6 h-6 text-amber-500" />
                        <h3 className="font-bold text-lg">Velocidade e Recursos</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Vídeos grandes exigem muita memória (RAM). Se o seu navegador travar ou a aba fechar, é provável que o dispositivo tenha ficado sem recursos. Tente fechar outras abas.
                    </p>
                </div>
            </div>

            <div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100">
                <h3 className="font-bold text-xl text-indigo-900 mb-6 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Perguntas Frequentes
                </h3>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-indigo-900">Por que demora tanto?</h4>
                        <p className="text-indigo-800 text-sm mt-1">
                            Vídeos são arquivos complexos. Converter exige processamento pesado que, normalmente, seria feito por servidores potentes. Aqui, seu próprio computador faz o trabalho.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-indigo-900">Quais formatos funcionam melhor?</h4>
                        <p className="text-indigo-800 text-sm mt-1">
                            Recomendamos usar vídeos MP4 ou WebM. Formatos como MOV ou MKV também funcionam, mas o resultado final em MP4 (H.264) é o mais compatível com redes sociais.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-indigo-900">Dicas para reduzir o tamanho:</h4>
                        <ul className="list-disc list-inside text-indigo-800 text-sm mt-2 space-y-1">
                            <li>Reduza a resolução (ex: de 1080p para 720p).</li>
                            <li>Remova o áudio se ele não for essencial.</li>
                            <li>Use a qualidade "Baixa" se precisar de um arquivo muito leve.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="text-center py-4">
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                    <PlayCircle className="w-4 h-4" />
                    Tecnologia FFmpeg.WASM (WebAssembly)
                </p>
            </div>
        </div>
    );
};
