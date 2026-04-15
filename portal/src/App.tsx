import { Button } from "./components/ui/button";

export default function App() {
  return (
    <section className="flex justify-center items-center min-h-screen">
      <div className="flex gap-2">
        <Button variant="destructive">Click Me</Button>
        <Button>Create Realese</Button>
      </div>
    </section>
  );
}
