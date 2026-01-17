import ProjectList from "@/components/projects/project-list";
import RevealWrapper from "@/components/animations/reveal-wrapper";

export default function Home() {
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
        <ProjectList />
      </div>
    </div>
  );
}
