import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { HomePage } from '@/components/HomePage';
import { AnalyzePage } from '@/components/AnalyzePage';
import { LearningView } from '@/components/LearningView';
import { UploadPage } from '@/components/UploadPage';

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze/:projectId" element={<AnalyzePage />} />
          <Route path="/learn/:projectId" element={<LearningView />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
