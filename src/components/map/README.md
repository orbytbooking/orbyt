# OpenStreetMap Component with Leaflet Draw Feature

## Overview

The OpenStreetMap component now includes Leaflet draw functionality, allowing users to draw shapes (polygons, circles, rectangles, and markers) directly on the map. This is particularly useful for defining service areas, coverage zones, or geographic boundaries.

## Features

### Drawing Tools
- **Polygon**: Draw custom polygon shapes for irregular service areas
- **Circle**: Draw circular service areas with radius
- **Rectangle**: Draw rectangular service areas
- **Marker**: Place individual markers for specific points

### Shape Management
- **Create**: Draw new shapes on the map
- **Edit**: Modify existing shapes by dragging vertices
- **Delete**: Remove shapes from the map
- **Real-time Updates**: Get instant feedback when shapes are created, edited, or deleted

## Usage

### Basic Usage

```tsx
import OpenStreetMap from '@/components/map/OpenStreetMap';

function MyComponent() {
  const [shapes, setShapes] = useState([]);

  const handleShapeCreated = (shape) => {
    console.log('New shape created:', shape);
    setShapes(prev => [...prev, shape]);
  };

  const handleShapeEdited = (shape) => {
    console.log('Shape edited:', shape);
    setShapes(prev => prev.map(s => s.id === shape.id ? shape : s));
  };

  const handleShapeDeleted = (shapeId) => {
    console.log('Shape deleted:', shapeId);
    setShapes(prev => prev.filter(s => s.id !== shapeId));
  };

  return (
    <OpenStreetMap
      locations={[]}
      enableDraw={true}
      onShapeCreated={handleShapeCreated}
      onShapeEdited={handleShapeEdited}
      onShapeDeleted={handleShapeDeleted}
      drawnShapes={shapes}
      height="500px"
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableDraw` | `boolean` | `false` | Enable/disable drawing tools |
| `onShapeCreated` | `(shape: DrawnShape) => void` | `undefined` | Callback when a shape is created |
| `onShapeEdited` | `(shape: DrawnShape) => void` | `undefined` | Callback when a shape is edited |
| `onShapeDeleted` | `(shapeId: string) => void` | `undefined` | Callback when a shape is deleted |
| `drawnShapes` | `DrawnShape[]` | `[]` | Array of existing shapes to display |

### DrawnShape Interface

```typescript
interface DrawnShape {
  id: string;
  type: 'polygon' | 'circle' | 'rectangle' | 'marker';
  coordinates: any; // GeoJSON coordinates
  properties?: {
    radius?: number; // For circles (in meters)
    area?: number; // Calculated area (in square meters)
    name?: string;
    description?: string;
  };
}
```

## Implementation Details

### Dependencies

The component uses the following packages:
- `leaflet` - Core mapping library
- `react-leaflet` - React bindings for Leaflet
- `leaflet-draw` - Drawing tools plugin
- `@types/leaflet` - TypeScript definitions
- `@types/leaflet-draw` - TypeScript definitions for draw plugin

### CSS Dependencies

The component automatically loads the required CSS:
- Leaflet CSS
- Leaflet Draw CSS

### Drawing Controls

When `enableDraw={true}`, the following controls appear on the map:
- **Drawing Tools**: Polygon, Circle, Rectangle, Marker tools
- **Edit Tools**: Edit and delete existing shapes
- **Toolbar**: Positioned in the top-left corner of the map

### Shape Data

All shapes are returned in GeoJSON format with additional properties:
- **Polygons/Rectangles**: Include calculated area in square meters
- **Circles**: Include radius in meters and calculated area
- **Markers**: Include coordinates and any custom properties

## Example Use Cases

### Service Area Definition
Perfect for businesses that need to define their service coverage areas:
- Delivery zones
- Service territories
- Operational boundaries

### Geographic Analysis
Useful for:
- Market analysis
- Coverage planning
- Territory management

### Interactive Mapping
Great for:
- User-defined regions
- Custom geographic annotations
- Interactive planning tools

## Integration with Backend

To persist shapes, you can integrate with your backend:

```typescript
const handleShapeCreated = async (shape) => {
  // Save to database
  const response = await fetch('/api/shapes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shape)
  });
  
  const savedShape = await response.json();
  setShapes(prev => [...prev, savedShape]);
};
```

## Styling

Shapes use a consistent blue color (`#3b82f6`) with 3px weight. You can customize the appearance by modifying the `shapeOptions` in the DrawControl component.

## Browser Compatibility

The draw feature works in all modern browsers that support:
- Canvas API (for drawing)
- Touch events (for mobile drawing)
- Geolocation API (optional, for location-based features)

## Performance Considerations

- Shapes are rendered using Leaflet's optimized canvas rendering
- Large numbers of shapes may impact performance
- Consider implementing shape clustering for hundreds of shapes
- Use debouncing for real-time shape updates

## Troubleshooting

### Common Issues

1. **Drawing tools not visible**: Ensure `enableDraw={true}` and the map is not in readonly mode
2. **Shapes not saving**: Check your callback functions and backend integration
3. **Performance issues**: Limit the number of shapes and consider server-side rendering for complex geometries

### Debug Mode

Enable console logging to debug shape events:
```typescript
const handleShapeCreated = (shape) => {
  console.log('Shape created:', shape);
  // Your logic here
};
```

## Future Enhancements

Potential improvements to consider:
- Shape styling customization
- Import/export shapes (GeoJSON, KML)
- Shape measurement tools
- Advanced shape validation
- Shape templates and presets
