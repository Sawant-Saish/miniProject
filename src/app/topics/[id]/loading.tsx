import { Card, CardContent } from "@/components/ui/card";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function TopicLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-8 w-56" />
        <Pulse className="h-6 w-72" />
      </div>
      <Card>
        <CardContent className="space-y-3 py-6">
          <Pulse className="h-6 w-40" />
          <Pulse className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
