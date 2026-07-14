import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProjectCard } from '@/components/ProjectCard';
import { WelcomeModal } from '@/components/WelcomeModal';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { projects } from '@/data/projects';
import '@/styles/HomePage.css';

export function HomePage() {
  const navigate = useNavigate();
  const [welcomed, setWelcomed] = useLocalStorage('code-mentor-welcomed', false);

  const handleCloseWelcome = () => {
    setWelcomed(true);
  };

  const handleSelectProject = (projectId: string) => {
    navigate(`/analyze/${projectId}`);
  };

  const handleUploadClick = () => {
    navigate('/upload');
  };

  return (
    <div className="homepage">
      <div className="homepage-container">
        <div className="homepage-header">
          <div></div>
          <ThemeToggle />
        </div>

        <div className="homepage-hero">
          <h1 className="homepage-title">Code Mentor</h1>
          <p className="homepage-subtitle">带你读懂项目</p>
          <p className="homepage-description">
            精选开源项目，逐行代码深度解读，从架构设计到实现细节，带你像资深开发者一样理解优秀代码的设计思路与工程实践。
          </p>
        </div>

        <button className="upload-cta-banner" onClick={handleUploadClick} type="button">
          <div className="upload-cta-glow" aria-hidden="true" />
          <div className="upload-cta-content">
            <div className="upload-cta-icon-wrapper">
              <Upload size={28} aria-hidden="true" />
              <Sparkles className="upload-cta-sparkle" size={16} aria-hidden="true" />
            </div>
            <div className="upload-cta-text">
              <div className="upload-cta-label">
                <Sparkles size={16} aria-hidden="true" />
                <span>亲手试试</span>
              </div>
              <h3 className="upload-cta-title">上传你自己的项目，让 AI 为你解读</h3>
              <p className="upload-cta-desc">
                配置 DeepSeek API，AI 导师将逐行分析你的源码，解释设计思路与技术要点，就像有一位资深工程师在身边指导
              </p>
            </div>
          </div>
          <div className="upload-cta-action">
            <span>立即上传</span>
            <ArrowRight size={20} aria-hidden="true" />
          </div>
        </button>

        <h2 className="homepage-section-title">或者先体验内置示例</h2>

        <div className="homepage-grid">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              featured={index === 0}
              onClick={() => handleSelectProject(project.id)}
            />
          ))}
        </div>

        <footer className="homepage-footer">
          <p className="homepage-footer-text">Code Mentor Demo · 仅供学习演示</p>
        </footer>
      </div>

      {!welcomed && <WelcomeModal onClose={handleCloseWelcome} />}
    </div>
  );
}
