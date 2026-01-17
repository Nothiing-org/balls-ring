'use client';

import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import ProjectCard from './project-card';
import { PlusCircle } from 'lucide-react';
import RevealWrapper from '../animations/reveal-wrapper';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectList() {
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-headline text-3xl font-bold">Your Projects</h2>
          <Link href="/projects/new" className="btn-primary">
            <PlusCircle size={20} />
            <span className="hidden md:inline">New Project</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="premium-card h-full flex flex-col">
              <Skeleton className="aspect-video w-full rounded-xl mb-6" />
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-5 w-1/2 mb-6" />
              <div className="mt-auto pt-6 border-t">
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-headline text-3xl font-bold">Your Projects</h2>
        <Link href="/projects/new" className="btn-primary">
          <PlusCircle size={20} />
          <span className="hidden md:inline">New Project</span>
        </Link>
      </div>
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <RevealWrapper key={project.id} delay={index * 100}>
              <ProjectCard project={project} />
            </RevealWrapper>
          ))}
        </div>
      ) : (
        <RevealWrapper>
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <h3 className="text-xl font-bold">No Projects Yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Click &quot;New Project&quot; to get started.
            </p>
            <Link href="/projects/new" className="btn-primary">
              <PlusCircle size={20} />
              <span>Create Your First Project</span>
            </Link>
          </div>
        </RevealWrapper>
      )}
    </div>
  );
}
