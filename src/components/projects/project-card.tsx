import Link from 'next/link';
import Image from 'next/image';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Square } from 'lucide-react';

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const lastDay = project.days.length > 0 ? project.days[project.days.length - 1] : null;
  const projectImage = lastDay?.frameDataUri || project.croppedImageUri;

  return (
    <div className="premium-card h-full flex flex-col">
      <Link href={`/projects/${project.id}`} className="block">
        <div className="aspect-video overflow-hidden rounded-xl border mb-6">
          <Image
            src={projectImage}
            alt={project.name}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            data-ai-hint="abstract gradient"
          />
        </div>
        <h3 className="text-2xl font-bold truncate">{project.name}</h3>
      </Link>
      <div className="flex-grow mt-4 space-y-3 text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>
            {lastDay ? `Day ${lastDay.dayIndex}` : 'Not started'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>
            {lastDay ? `${lastDay.followerCount.toLocaleString()} followers` : '0 followers'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Square size={16} />
          <span>
            {lastDay ? `${Math.round((lastDay.pixelsRevealed / project.maxPixelsCap) * 100)}% revealed` : '0% revealed'}
          </span>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t">
        <Link href={`/projects/${project.id}`} className="btn-primary w-full">
          Generate Today
        </Link>
      </div>
    </div>
  );
}
