import { Card, CardContent } from "@/components/ui/card";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function HomeLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Pulse className="h-9 w-64" />
        <Pulse className="h-4 w-full max-w-2xl" />
        <Pulse className="h-4 w-80" />
        <div className="flex gap-2 pt-1">
          <Pulse className="h-8 w-32" />
          <Pulse className="h-8 w-28" />
        </div>
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          <Pulse className="h-24 w-full" />
          <Pulse className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
