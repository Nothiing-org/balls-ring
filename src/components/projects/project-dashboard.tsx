'use client';

import { useState } from 'react';
import type { Project, Day } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';

import { generateDailyFrame } from '@/ai/flows/generate-daily-frame';
import { useProjects } from '@/hooks/use-projects';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download } from 'lucide-react';
import RevealWrapper from '../animations/reveal-wrapper';
import EscapeVisualization from './escape-visualization';

const dailyUpdateSchema = z.object({
  followerCount: z.coerce.number().int().min(0, 'Follower count must be positive'),
});

type DailyUpdateFormData = z.infer<typeof dailyUpdateSchema>;

type ProjectDashboardProps = {
  project: Project;
};

export default function ProjectDashboard({ project }: ProjectDashboardProps) {
  const { addDayToProject } = useProjects();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const lastDay = project.days.length > 0 ? project.days[project.days.length - 1] : null;
  const currentDayIndex = lastDay ? lastDay.dayIndex + 1 : 1;
  
  const { register, handleSubmit, formState: { errors } } = useForm<DailyUpdateFormData>({
    resolver: zodResolver(dailyUpdateSchema),
    defaultValues: {
      followerCount: lastDay?.followerCount || 0,
    },
  });

  const onSubmit = async (data: DailyUpdateFormData) => {
    setIsLoading(true);
    try {
      if (project.revealMode === 'escape') {
        const newFollowers = data.followerCount - (lastDay?.followerCount || 0);
        if (newFollowers < 0) {
            toast({ title: "Follower count can't decrease", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        const newDay: Day = {
            dayIndex: currentDayIndex,
            followerCount: data.followerCount,
            createdAt: new Date().toISOString(),
        };
        addDayToProject(project.id, newDay);
        toast({ title: `Day ${currentDayIndex} updated!`, description: `${newFollowers} new followers added as orbs.` });

      } else {
        const revealedPixelsFromPreviousDay = lastDay?.pixelsRevealed || 0;
        
        const followerCountForCalc = project.revealMode === 'delta' 
            ? (data.followerCount - (lastDay?.followerCount || 0))
            : data.followerCount;

        if (followerCountForCalc < 0 && project.revealMode === 'delta') {
            toast({ title: "Follower count can't decrease in delta mode", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const input = {
            baseImageUri: project.croppedImageUri,
            followerCount: followerCountForCalc,
            pixelsPerFollower: project.pixelsPerFollower,
            maxPixelsCap: project.maxPixelsCap,
            randomSeed: project.randomSeed,
            dayIndex: currentDayIndex,
            revealMode: project.revealMode,
            revealedPixelsFromPreviousDay: revealedPixelsFromPreviousDay,
        };

        const result = await generateDailyFrame(input);

        if (result && result.frameDataUri && result.revealedPixelCount) {
          const newDay: Day = {
            dayIndex: currentDayIndex,
            followerCount: data.followerCount,
            pixelsRevealed: result.revealedPixelCount,
            frameDataUri: result.frameDataUri,
            createdAt: new Date().toISOString(),
          };
          addDayToProject(project.id, newDay);
          toast({ title: `Day ${currentDayIndex} generated!`, description: `${result.revealedPixelCount.toLocaleString()} pixels revealed.` });
        } else {
          throw new Error('Frame generation failed.');
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Generation Error',
        description: 'Could not generate the frame. Please check the console and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentFrame = lastDay?.frameDataUri || project.croppedImageUri;

  const handleExportPNG = () => {
    if (project.revealMode === 'escape' || !currentFrame) {
        toast({ title: 'Not available', description: 'PNG export is not available for Escape Mode projects.', variant: 'destructive' });
        return;
    };
    const link = document.createElement('a');
    link.href = currentFrame;
    link.download = `${project.name.replace(/\s+/g, '_')}_Day_${lastDay?.dayIndex || 0}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportMP4 = () => {
    toast({
      title: "Video Export (Coming Soon)",
      description: "Full video export is a planned feature. Stay tuned!",
    });
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <RevealWrapper>
        <h1 className="text-center mb-2">{project.name}</h1>
        <p className="text-center text-muted-foreground text-lg mb-12">Day {currentDayIndex}</p>
      </RevealWrapper>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <RevealWrapper delay={100} className="lg:col-span-2">
            {project.revealMode === 'escape' ? (
                <EscapeVisualization project={project} />
            ) : (
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="label-sm">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-input rounded-lg overflow-hidden relative">
                             <Image
                                src={currentFrame}
                                alt="Project Preview"
                                fill
                                className="object-contain"
                             />
                        </div>
                    </CardContent>
                </Card>
            )}
        </RevealWrapper>
        
        <RevealWrapper delay={200}>
            <div className="space-y-8">
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="label-sm">Generate Today&apos;s Frame</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="followerCount">
                                    {project.revealMode === 'delta' ? `Today's Follower Count` : 'Follower Count'}
                                </Label>
                                <Input
                                    id="followerCount"
                                    type="number"
                                    min="0"
                                    className="input-styled"
                                    {...register('followerCount')}
                                />
                                {errors.followerCount && <p className="text-sm text-destructive">{errors.followerCount.message}</p>}
                            </div>
                            <Button type="submit" className="btn-primary w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : `Generate Day ${currentDayIndex}`}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="label-sm">Export</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleExportPNG} variant="outline" className="w-full" disabled={!lastDay || project.revealMode === 'escape'}>
                            <Download className="mr-2 h-4 w-4" /> Export as PNG
                        </Button>
                        <Button onClick={handleExportMP4} variant="outline" className="w-full" disabled={!lastDay}>
                            <Download className="mr-2 h-4 w-4" /> Export as MP4
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </RevealWrapper>
      </div>

       {project.revealMode !== 'escape' && (
         <RevealWrapper delay={300} className="mt-16">
            <h2 className="text-3xl font-bold mb-8">History</h2>
            {project.days.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...project.days].reverse().map(day => (
                  <Card key={day.dayIndex} className="p-4">
                    <div className="aspect-square relative mb-4 rounded-md overflow-hidden bg-input">
                      {day.frameDataUri && <Image src={day.frameDataUri} alt={`Day ${day.dayIndex}`} fill className="object-contain"/>}
                    </div>
                    <h4 className="font-bold">Day {day.dayIndex}</h4>
                    <p className="text-sm text-muted-foreground">{day.followerCount.toLocaleString()} followers</p>
                    <p className="text-sm text-muted-foreground">{Math.round(((day.pixelsRevealed || 0) / project.maxPixelsCap) * 100)}% revealed</p>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <h3 className="text-xl font-bold">No History Yet</h3>
                <p className="text-muted-foreground mt-2">Generate your first day to see it here.</p>
              </div>
            )}
        </RevealWrapper>
       )}
    </div>
  );
}
