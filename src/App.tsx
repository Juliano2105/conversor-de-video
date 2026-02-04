import { useState } from 'react';
import { Layout } from './components/Layout';
import { HelpPage } from './pages/Help';
import { HomePage } from './pages/HomePage';

type Page = 'home' | 'help';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {currentPage === 'home' ? (
        <HomePage />
      ) : (
        <HelpPage />
      )}
    </Layout>
  );
}

export default App;
