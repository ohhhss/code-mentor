import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnalyzingScreen } from '@/components/AnalyzingScreen';
import { projects } from '@/data/projects';

export function AnalyzePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!project) {
      navigate('/', { replace: true });
    }
  }, [project, navigate]);

  const handleComplete = useCallback(() => {
    if (projectId) {
      navigate(`/learn/${projectId}`, { replace: true });
    }
  }, [projectId, navigate]);

  if (!project) {
    return null;
  }

  return (
    <AnalyzingScreen
      projectName={project.name}
      projectAccentColor={project.accentColor}
      onComplete={handleComplete}
    />
  );
}
