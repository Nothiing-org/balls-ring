import NewProjectForm from "@/components/projects/new-project-form";
import RevealWrapper from "@/components/animations/reveal-wrapper";

export default function NewProjectPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:py-24">
      <RevealWrapper>
        <div className="text-center">
          <h1 className="mb-4">Create New Project</h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s get started. Set up your project to begin the reveal.
          </p>
        </div>
      </RevealWrapper>
      <RevealWrapper delay={200}>
        <div className="mt-12">
          <NewProjectForm />
        </div>
      </RevealWrapper>
    </div>
  );
}
