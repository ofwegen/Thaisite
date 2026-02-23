import { useState } from 'react';
import { Menu, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DndExercise } from './components/DndExercise';
import { useProgress } from './hooks/useProgress';
import contentData from './assets/content.json';
import exercisesConfig from '../exercises.json';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState(() => {
    const saved = localStorage.getItem('selected_path');
    if (saved) return saved;
    return contentData[0]?.unitPdfUrl || contentData[0]?.pages[0]?.path;
  });
  const [isLoading, setIsLoading] = useState(false);

  const progress = useProgress();

  let currentPage = null;
  let currentUnit = null;

  for (const unit of contentData) {
    if (unit.unitPdfUrl === selectedPath) {
      currentPage = { type: 'pdf', title: 'Lesson PDF', url: unit.unitPdfUrl, path: unit.unitPdfUrl };
      currentUnit = unit;
      break;
    }

    const match = unit.pages.find(p => p.path === selectedPath);
    if (match) {
      currentPage = match;
      currentUnit = unit;
      break;
    }
  }

  const handleSelect = (path) => {
    setSelectedPath(path);
    localStorage.setItem('selected_path', path);
    setIsSidebarOpen(false);
    setIsLoading(true);
  };

  // Resolve exercise description from exercises.json config
  const getExerciseDescription = (path) => {
    const entry = exercisesConfig.exercises?.[path];
    if (entry?.description) return entry.description;
    return exercisesConfig.defaultDescription || '';
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          className="menu-button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <span className="mobile-title">Thai Learning Platform</span>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        contentData={contentData}
        selectedPath={selectedPath}
        onSelect={handleSelect}
        progress={progress}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper" style={currentPage?.type === 'pdf' ? { height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem' } : {}}>
          <header className="page-header" style={currentPage?.type === 'pdf' ? { marginBottom: '1rem' } : {}}>
            {currentUnit && <h1>{currentUnit.unit}</h1>}
            {currentPage && <p className="subtitle">{currentPage.title}</p>}
          </header>

          <section className="exercise-section" style={currentPage?.type === 'pdf' ? { flex: 1, display: 'flex' } : {}}>
            {currentPage?.type === 'dnd' ? (
              currentPage.data.length > 0 ? (
                <DndExercise
                  key={currentPage.path}
                  exerciseData={currentPage.data}
                  description={getExerciseDescription(currentPage.path)}
                  onReady={() => setIsLoading(false)}
                  onComplete={() => progress.markDone(currentPage.path)}
                />
              ) : (
                <div style={{ padding: '2rem', background: 'var(--surface-color)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                  <p>This exercise does not use the standard Drag-and-Drop format.</p>
                  <a href={`http://davidpi.totddns.com:42852/${currentPage.path}`} target="_blank" rel="noreferrer" style={{ marginTop: '1rem', display: 'inline-block' }} className="nav-link active">
                    Open Original Version
                  </a>
                </div>
              )
            ) : currentPage?.type === 'pdf' ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {isLoading && (
                  <div className="loading-overlay">
                    <Loader2 size={36} className="spinner" />
                    <span>Loading...</span>
                  </div>
                )}
                <iframe
                  src={currentPage.url}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--border-radius-md)', background: 'var(--surface-color)' }}
                  title={currentPage.title}
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            ) : (
              <p>Please select an item from the sidebar.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
