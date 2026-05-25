# Next.js Image Configuration Setup

## Problem
When using Supabase storage with Next.js `<Image>` component, you may encounter this error:
```
Invalid src prop (https://your-project.supabase.co/storage/v1/object/public/...) on 'next/image', hostname 'your-project.supabase.co' is not configured under images in your `next.config.js`
```

## Solution
Configure Next.js to allow images from your Supabase storage domain.

### Configuration File: `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-project.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'your-project.supabase.co',
        port: '',
        pathname: '/storage/v1/render/image/**',
      },
    ],
    // For backward compatibility
    domains: [
      'your-project.supabase.co',
    ],
  },
}

export default nextConfig
```

## Key Points

1. **File Extension**: Use `.mjs` extension for ES module projects (when `package.json` has `"type": "module"`)

2. **Remote Patterns**: More secure than domains - allows specific path patterns
   - `/storage/v1/object/public/**` - All public storage files
   - `/storage/v1/render/image/**` - Supabase image transformations

3. **Domains**: Backward compatibility for older Next.js versions

4. **Development**: Added localhost patterns for local development

## Implementation Steps

1. Create `next.config.mjs` in project root
2. Add your Supabase project hostname
3. Restart the development server
4. Test image loading

## Testing

Use the provided test script to verify configuration:
```bash
node test-image-config.js
```

## Common Issues

- **Module Error**: Use `.mjs` extension for ES module projects
- **Hostname Mismatch**: Ensure exact hostname matches your Supabase project
- **Server Restart**: Required after config changes
- **Path Patterns**: Use `**` wildcard for subdirectories

## Example Usage

```jsx
import Image from 'next/image';

// This will now work with the configuration
<Image 
  src="https://your-project.supabase.co/storage/v1/object/public/business-logos/logo.jpg"
  alt="Business Logo"
  width={100}
  height={100}
/>
```

## Security Notes

- Only configure domains you trust
- Use specific path patterns when possible
- Avoid wildcard domains (`**`) in production
