// Update this page (the content is just a fallback if you fail to update the page)
import BackButton from '@/components/ui/BackButton';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
