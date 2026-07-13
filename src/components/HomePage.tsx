import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="homepage">
      <div className="homepage-container">
        <div className="homepage-header">
          <div></div>
          <ThemeToggle />
        </div>

        <div className="homepage-hero">
          <h1 className="homepage-title">Code Mentor</h1>
          <p className="homepage-subtitle">像导师一样读懂优秀源码</p>
          <p className="homepage-description">
            精选开源项目，逐行代码深度解读，从架构设计到实现细节，带你像资深开发者一样理解优秀代码的设计思路与工程实践。
          </p>
        </div>

        <h2 className="homepage-section-title">选择一个项目开始学习</h2>

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
