"use client";

import DrawTest from "@/components/map/DrawTest";

export default function TestDrawPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Map Draw Test</h1>
          <p className="text-muted-foreground">
            Test the Leaflet draw functionality. Click "Drawing On" to enable drawing tools.
          </p>
        </div>
        
        <DrawTest />
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">How to Use:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Drawing On" to enable drawing tools</li>
            <li>Look for the drawing toolbar in the top-left corner of the map</li>
            <li>Select a drawing tool (polygon, circle, rectangle, or marker)</li>
            <li>Draw on the map - shapes will appear below</li>
            <li>Use the edit tool (pencil icon) to modify shapes</li>
            <li>Use the delete tool to remove shapes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
