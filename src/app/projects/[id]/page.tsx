'use client';

import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import type { Project } from '@/lib/types';
import ProjectDashboard from '@/components/projects/project-dashboard';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectPage() {
  const params = useParams();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const projectId = typeof params.id === 'string' ? params.id : '';
  
  const projectRef = useMemoFirebase(() => {
    if (!user || !firestore || !projectId) return null;
    return doc(firestore, `users/${user.uid}/projects`, projectId);
  }, [firestore, user, projectId]);

  const { data: project, isLoading } = useDoc<Project>(projectRef);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="h-10 w-1/2 mx-auto mb-2" />
        <Skeleton className="h-6 w-1/4 mx-auto mb-12" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
             <Skeleton className="aspect-video w-full rounded-2xl" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 md:py-24 text-center">
        <h1 className="text-3xl font-bold">Project Not Found</h1>
        <p className="text-muted-foreground mt-4">The project you are looking for does not exist or you do not have permission to view it.</p>
        <Link href="/" className="btn-primary mt-8">Go to Projects</Link>
      </div>
    );
  }

  return <ProjectDashboard project={project} />;
}
