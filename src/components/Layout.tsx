import React from 'react';
import { Video, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
    children: React.ReactNode;
    currentPage: 'home' | 'help';
    onPageChange: (page: 'home' | 'help') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => onPageChange('home')}
                    >
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <Video className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Conversor de Vídeo</h1>
                    </div>

                    <nav className="flex gap-4">
                        <button
                            onClick={() => onPageChange('home')}
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                currentPage === 'home' ? "text-indigo-600 bg-indigo-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            Início
                        </button>
                        <button
                            onClick={() => onPageChange('help')}
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                currentPage === 'help' ? "text-indigo-600 bg-indigo-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            <HelpCircle className="w-4 h-4" />
                            Ajuda
                        </button>
                    </nav>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
                {children}
            </main>

            <footer className="bg-white border-t border-gray-200 py-8">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} Conversor de Vídeo Local. Privacidade garantida: nada sai do seu navegador.
                    </p>
                </div>
            </footer>
        </div>
    );
};
