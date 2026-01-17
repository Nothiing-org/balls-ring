'use client';

import { useEffect } from 'react';
import { useFirebase, initiateAnonymousSignIn } from '@/firebase';
import ProjectList from "@/components/projects/project-list";
import RevealWrapper from "@/components/animations/reveal-wrapper";
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { auth, user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth, user, isUserLoading]);


  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-24">
      <RevealWrapper>
        <div className="text-center">
          <h1 className="mb-4">PixelReveal</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Turn your follower growth into a captivating visual journey. Create viral progress videos where every follower reveals a piece of a hidden masterpiece.
          </p>
        </div>
      </RevealWrapper>

      <div className="mt-16">
        {isUserLoading ? (
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
        ) : (
          <ProjectList />
        )}
      </div>
    </div>
  );
}
