# Landing Page API Documentation

This API allows your CRM to manage landing page content, colors, sections, and images.

## Base URL
```
https://motqljsfnmczlynnmcpd.supabase.co/functions/v1/landing-page-api
```

## Endpoints

### 1. Get All Landing Page Data
**GET** `/all`

Returns complete landing page configuration and all sections.

**Response:**
```json
{
  "config": {
    "id": "uuid",
    "primary_color": "#06b6d4",
    "secondary_color": "#0f172a",
    "accent_color": "#8b5cf6",
    "business_name": "Orbyt Cleaners",
    "business_tagline": "Professional Cleaning Services in Chicago",
    "phone": "+1 234 567 890",
    "email": "info@orbytcleaners.com",
    "address": "123 Main St, Chicago, IL",
    "logo_url": "https://..."
  },
  "sections": [
    {
      "id": "uuid",
      "section_type": "hero",
      "section_order": 1,
      "is_visible": true,
      "title": "Section Title",
      "subtitle": "Section Subtitle",
      "content": {},
      "background_image_url": "https://...",
      "section_items": []
    }
  ]
}
```

### 2. Update Brand Colors & Config
**PUT** `/config`

Update global configuration including brand colors, business info, etc.

**Request Body:**
```json
{
  "id": "uuid",
  "primary_color": "#ff6b6b",
  "business_name": "New Business Name",
  "phone": "+1 555 123 4567"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated config */ }
}
```

### 3. Update Section
**PUT** `/section`

Update section content, visibility, or order.

**Request Body:**
```json
{
  "id": "section-uuid",
  "title": "New Title",
  "subtitle": "New Subtitle",
  "is_visible": false,
  "content": { "custom": "data" }
}
```

### 4. Create New Section
**POST** `/section`

Add a new section to the landing page.

**Request Body:**
```json
{
  "section_type": "services",
  "section_order": 5,
  "title": "Our Services",
  "subtitle": "What we offer",
  "is_visible": true
}
```

### 5. Delete Section
**DELETE** `/section`

Remove a section from the landing page.

**Request Body:**
```json
{
  "id": "section-uuid"
}
```

### 6. Reorder Sections
**PUT** `/reorder`

Change the order of sections (drag & drop functionality).

**Request Body:**
```json
{
  "sections": [
    { "id": "uuid-1", "order": 1 },
    { "id": "uuid-2", "order": 2 },
    { "id": "uuid-3", "order": 3 }
  ]
}
```

### 7. Upload Image
**POST** `/upload`

Upload images for sections or logo.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field

**Response:**
```json
{
  "success": true,
  "url": "https://motqljsfnmczlynnmcpd.supabase.co/storage/v1/object/public/landing-page-images/filename.jpg"
}
```

## Section Types

Available section types:
- `hero` - Main hero section
- `how_it_works` - Steps/process section
- `services` - Services list
- `reviews` - Customer testimonials
- `referral` - Referral program
- `contact` - Contact form

## Example: CRM Integration

```javascript
// Update brand colors from your CRM
async function updateBrandColors(primaryColor, secondaryColor) {
  const response = await fetch(
    'https://motqljsfnmczlynnmcpd.supabase.co/functions/v1/landing-page-api/config',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'your-config-id',
        primary_color: primaryColor,
        secondary_color: secondaryColor
      })
    }
  );
  
  return await response.json();
}

// Upload new hero image
async function uploadHeroImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    'https://motqljsfnmczlynnmcpd.supabase.co/functions/v1/landing-page-api/upload',
    {
      method: 'POST',
      body: formData
    }
  );
  
  const { url } = await response.json();
  
  // Update hero section with new image
  await fetch(
    'https://motqljsfnmczlynnmcpd.supabase.co/functions/v1/landing-page-api/section',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'hero-section-id',
        background_image_url: url
      })
    }
  );
}
```

## Database Access

You can also directly access the database from your CRM:

**Connection URL:** `https://motqljsfnmczlynnmcpd.supabase.co`  
**Anon Key:** Available in Lovable Cloud settings

### Tables:
- `landing_page_config` - Global configuration
- `sections` - Landing page sections
- `section_items` - Items within sections (services, reviews, etc.)

All tables have public read/write access for easy CRM integration.
