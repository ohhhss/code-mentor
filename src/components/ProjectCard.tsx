import { Github, Clock } from 'lucide-react';
import type { Project } from '@/types';
import '@/styles/ProjectCard.css';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  featured?: boolean;
}

const difficultyLabels: Record<Project['difficulty'], string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

function getGithubPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname.replace(/\/$/, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

export function ProjectCard({ project, onClick, featured = false }: ProjectCardProps) {
  const handleGithubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(project.githubUrl, '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`project-card${featured ? ' featured' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{ '--project-accent': project.accentColor } as React.CSSProperties}
    >
      {featured && (
        <div className="project-card-recommend-badge">
          <span>🚀 推荐起点</span>
        </div>
      )}
      <div className="project-card-header">
        <div className="project-card-title-row">
          <h3 className="project-card-name">{project.name}</h3>
        </div>
        <button
          className="project-card-github-btn"
          onClick={handleGithubClick}
          aria-label={`在 GitHub 上查看 ${project.name}`}
          title="在 GitHub 上查看"
        >
          <Github size={18} />
        </button>
      </div>

      <div className="project-card-badges">
        <span className={`project-card-difficulty project-card-difficulty-${project.difficulty}`}>
          {difficultyLabels[project.difficulty]}
        </span>
        {project.isWalkthrough && (
          <span className="project-card-walkthrough">
            ✨ 完整走读
          </span>
        )}
      </div>

      <div className="project-card-time">
        <Clock size={16} />
        <span>{project.estimatedTime}</span>
      </div>

      <p className="project-card-tagline">{project.tagline}</p>

      <div className="project-card-tech">
        {project.techStack.map((tech) => (
          <span key={tech} className="project-card-tech-tag">
            {tech}
          </span>
        ))}
      </div>

      <div className="project-card-footer">
        <span className="project-card-github-path">{getGithubPath(project.githubUrl)}</span>
      </div>
    </div>
  );
}
