'use client';

import { useCallback } from 'react';
import { collection, doc, query, setDoc, updateDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Project, Day } from '@/lib/types';


export function useProjects() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const projectsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/projects`));
  }, [firestore, user]);

  const { data: projects, isLoading } = useCollection<Project>(projectsCollection);

  const addProject = useCallback((project: Omit<Project, 'userId'>) => {
    if (!user || !firestore) return;
    const projectWithUser: Project = { ...project, userId: user.uid };
    const projectRef = doc(firestore, `users/${user.uid}/projects`, project.id);
    setDocumentNonBlocking(projectRef, projectWithUser, {});
  }, [user, firestore]);

  const getProject = useCallback((id: string) => {
    return projects?.find(p => p.id === id);
  }, [projects]);
  
  const addDayToProject = useCallback((projectId: string, day: Day) => {
    if (!user || !firestore) return;
    const project = getProject(projectId);
    if (project) {
        const existingDayIndex = project.days.findIndex(d => d.dayIndex === day.dayIndex);
        let newDays;
        if (existingDayIndex > -1) {
            newDays = [...project.days];
            newDays[existingDayIndex] = day;
        } else {
            newDays = [...project.days, day];
        }
        
        const updatedDays = newDays.sort((a,b) => a.dayIndex - b.dayIndex);

        const projectRef = doc(firestore, `users/${user.uid}/projects`, projectId);
        updateDocumentNonBlocking(projectRef, { days: updatedDays });
    }
  }, [getProject, user, firestore]);

  return { projects: projects || [], isLoading, addProject, getProject, addDayToProject };
}
