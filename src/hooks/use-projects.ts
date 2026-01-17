'use client';

import { useCallback } from 'react';
import type { Project, Day } from '@/lib/types';
import useLocalStorage from './use-local-storage';

export function useProjects() {
  const [projects, setProjects] = useLocalStorage<Project[]>('pixelreveal-projects', []);

  const addProject = useCallback((project: Project) => {
    setProjects(prevProjects => [...prevProjects, project]);
  }, [setProjects]);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prevProjects =>
      prevProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
    );
  }, [setProjects]);
  
  const addDayToProject = useCallback((projectId: string, day: Day) => {
    const project = getProject(projectId);
    if (project) {
        // Ensure we don't add a day with a duplicate index
        const existingDayIndex = project.days.findIndex(d => d.dayIndex === day.dayIndex);
        let newDays;
        if (existingDayIndex > -1) {
            // If day exists, replace it (regeneration)
            newDays = [...project.days];
            newDays[existingDayIndex] = day;
        } else {
            newDays = [...project.days, day];
        }
        
        const updatedProject = {
            ...project,
            days: newDays.sort((a,b) => a.dayIndex - b.dayIndex),
        };
        updateProject(updatedProject);
    }
  }, [getProject, updateProject]);

  return { projects, addProject, getProject, updateProject, addDayToProject };
}
