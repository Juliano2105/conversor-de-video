import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ConverterContainer } from '../components/ConverterContainer';

export const HomePage: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-3">
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    Converta vídeos pesados <span className="text-indigo-600">sem complicação</span>
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Alta performance, privacidade total e processamento 100% local direto no seu navegador.
                </p>

                <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-1.5 rounded-full border border-green-100 mt-4">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Privacidade Garantida: Nada é enviado para o servidor</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                <ConverterContainer />
            </div>
        </div>
    );
};
