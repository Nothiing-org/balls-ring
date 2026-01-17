'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjects } from '@/hooks/use-projects';
import type { Project, RevealMode } from '@/lib/types';
import { useUser } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '../ui/badge';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  baseImage: z.instanceof(File).optional(),
  revealMode: z.enum(['total', 'delta', 'escape']),
  pixelsPerFollower: z.number().min(1).max(100),
  randomSeed: z.number(),
}).superRefine((data, ctx) => {
  if ((data.revealMode === 'total' || data.revealMode === 'delta') && !data.baseImage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['baseImage'],
      message: 'Image is required for this reveal mode',
    });
  }
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function NewProjectForm() {
  const router = useRouter();
  const { addProject } = useProjects();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      revealMode: 'total',
      pixelsPerFollower: 1,
      randomSeed: Math.floor(Math.random() * 1000000),
    },
  });

  const pixelsPerFollower = watch('pixelsPerFollower');
  const revealMode = watch('revealMode');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('baseImage', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onSubmit = async (data: ProjectFormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a project.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
      if (data.revealMode === 'total' || data.revealMode === 'delta') {
        if (!data.baseImage) {
            toast({ title: 'Error', description: 'Please select an image.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(data.baseImage);
        reader.onload = (e) => {
          const originalImage = e.target?.result as string;
    
          const img = document.createElement('img');
          img.src = originalImage;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                toast({ title: 'Error', description: 'Could not process image.', variant: 'destructive' });
                setIsLoading(false);
                return;
            };
    
            const size = 1000; // Internal canvas size
            canvas.width = size;
            canvas.height = size;
    
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.max(hRatio, vRatio);
            const centerShift_x = (canvas.width - img.width * ratio) / 2;
            const centerShift_y = (canvas.height - img.height * ratio) / 2;
    
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, img.width, img.height,
              centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
    
            const croppedImageUri = canvas.toDataURL('image/png');
            
            const maxPixelsCap = size * size;
            const newProjectId = crypto.randomUUID();

            const newProject: Omit<Project, 'userId'> = {
              id: newProjectId,
              name: data.name,
              croppedImageUri: croppedImageUri,
              revealMode: data.revealMode as RevealMode,
              pixelsPerFollower: data.pixelsPerFollower,
              maxPixelsCap: maxPixelsCap,
              randomSeed: data.randomSeed,
              days: [],
              createdAt: new Date().toISOString(),
            };
    
            addProject(newProject);
            
            toast({
                title: 'Project Created',
                description: `Your new project "${data.name}" is ready.`,
            });
            router.push(`/projects/${newProjectId}`);
          };
          img.onerror = () => {
            toast({ title: 'Error', description: 'Failed to load image.', variant: 'destructive' });
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
            toast({ title: 'Error', description: 'Failed to read file.', variant: 'destructive' });
            setIsLoading(false);
        }
      } else { // Escape mode
        const newProjectId = crypto.randomUUID();
        const newProject: Omit<Project, 'userId'> = {
          id: newProjectId,
          name: data.name,
          croppedImageUri: '', // No image for escape mode
          revealMode: data.revealMode as RevealMode,
          pixelsPerFollower: data.pixelsPerFollower,
          maxPixelsCap: 0, // Not applicable
          randomSeed: data.randomSeed,
          days: [],
          createdAt: new Date().toISOString(),
        };

        addProject(newProject);
        
        toast({
            title: 'Project Created',
            description: `Your new project "${data.name}" is ready.`,
        });
        router.push(`/projects/${newProjectId}`);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not create the project. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 premium-card">
      <div className="space-y-2">
        <Label htmlFor="name" className="label-sm">Project Name</Label>
        <Input
          id="name"
          placeholder="e.g. My TikTok Campaign"
          {...register('name')}
          className="input-styled text-lg"
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {(revealMode === 'total' || revealMode === 'delta') && (
        <div className="space-y-2">
          <Label htmlFor="baseImage" className="label-sm">Base Image</Label>
          <div className="mt-2">
            <Controller
              name="baseImage"
              control={control}
              render={({ field }) => (
                <div className="w-full">
                  <label
                    htmlFor="baseImage-input"
                    className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-border border-dashed rounded-lg cursor-pointer bg-input hover:bg-accent"
                  >
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Image preview"
                        fill
                        className="object-contain p-2 rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    )}
                    <input
                      id="baseImage-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              )}
            />
          </div>
          {errors.baseImage && <p className="text-sm text-destructive">{errors.baseImage.message as string}</p>}
        </div>
      )}

      <div className="space-y-4">
        <Label className="label-sm">Reveal Mode</Label>
        <Controller
          name="revealMode"
          control={control}
          render={({ field }) => (
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="grid grid-cols-1 gap-4"
            >
              <Label className="flex flex-col items-start space-y-2 rounded-lg border p-4 cursor-pointer has-[:checked]:bg-accent has-[:checked]:border-foreground">
                <RadioGroupItem value="total" />
                <span className="font-bold">Total Followers</span>
                <span className="text-sm text-muted-foreground">Reveals pixels based on your total follower count each day.</span>
              </Label>
              <Label className="flex flex-col items-start space-y-2 rounded-lg border p-4 cursor-pointer has-[:checked]:bg-accent has-[:checked]:border-foreground">
                <RadioGroupItem value="delta" />
                <span className="font-bold">New Followers (Delta)</span>
                <span className="text-sm text-muted-foreground">Reveals pixels only for new followers gained since the last update.</span>
              </Label>
              <Label className="flex flex-col items-start space-y-2 rounded-lg border p-4 cursor-pointer has-[:checked]:bg-accent has-[:checked]:border-foreground">
                 <div className="flex w-full justify-between items-center">
                    <RadioGroupItem value="escape" />
                    <Badge variant="outline" className="border-primary text-primary">High Retention</Badge>
                 </div>
                <span className="font-bold">Escape Room</span>
                <span className="text-sm text-muted-foreground">A kinetic frustration game where orbs try to escape a rotating prison.</span>
              </Label>
            </RadioGroup>
          )}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label htmlFor="pixelsPerFollower" className="label-sm">
            {revealMode === 'escape' ? 'Orbs per Follower' : 'Pixels per Follower'}
          </Label>
          <span className="text-lg font-bold">{pixelsPerFollower}</span>
        </div>
        <Controller
          name="pixelsPerFollower"
          control={control}
          render={({ field }) => (
            <Slider
              id="pixelsPerFollower"
              min={1}
              max={100}
              step={1}
              value={[field.value]}
              onValueChange={(value) => field.onChange(value[0])}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="randomSeed" className="label-sm">Random Seed</Label>
        <div className="flex gap-2">
          <Input
            id="randomSeed"
            type="number"
            {...register('randomSeed', { valueAsNumber: true })}
            className="input-styled"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setValue('randomSeed', Math.floor(Math.random() * 1000000))}
          >
            Randomize
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">The seed ensures your pixel reveal is the same every time you generate it.</p>
        {errors.randomSeed && <p className="text-sm text-destructive">{errors.randomSeed.message}</p>}
      </div>

      <div className="pt-8 border-t">
        <Button type="submit" className="btn-primary w-full" disabled={isLoading || !user}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Project...
            </>
          ) : (
            'Create Project'
          )}
        </Button>
      </div>
    </form>
  );
}
