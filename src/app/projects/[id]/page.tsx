'use client';

import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import ProjectDashboard from '@/components/projects/project-dashboard';
import Link from 'next/link';

export default function ProjectPage() {
  const params = useParams();
  const { getProject } = useProjects();
  const projectId = typeof params.id === 'string' ? params.id : '';
  const project = getProject(projectId);

  if (!project) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 md:py-24 text-center">
        <h1 className="text-3xl font-bold">Project Not Found</h1>
        <p className="text-muted-foreground mt-4">The project you are looking for does not exist.</p>
        <Link href="/" className="btn-primary mt-8">Go to Projects</Link>
      </div>
    );
  }

  return <ProjectDashboard project={project} />;
}
