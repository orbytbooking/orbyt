# Image Sources for Cleaning Service Website

## Images Added to the Project

### 1. ServicesSection Component
Located in: `src/components/ServicesSection.tsx`

#### Service Card Images:
- **Residential Cleaning**: https://images.unsplash.com/photo-1581578731548-c64695cc6952
  - Shows: Modern home cleaning
  
- **Commercial Cleaning**: https://images.unsplash.com/photo-1497366216548-37526070297c
  - Shows: Office/workspace cleaning
  
- **Specialty Services**: https://images.unsplash.com/photo-1600585154526-990dced4b1ff
  - Shows: Professional cleaning equipment

#### Main Feature Image:
- **Cleaning Service Professional**: `/images/services/cleaning service.png`
  - Location: `public/images/services/cleaning service.png`
  - Your uploaded image

---

### 2. BookingPage Component
Located in: `src/pages/BookingPage.tsx`

#### Service Selection Images:
- **Standard Cleaning**: https://images.unsplash.com/photo-1581578731548-c64695cc6952
  - Basic home cleaning service
  
- **Deep Cleaning**: https://images.unsplash.com/photo-1600585154340-be6161a56a0c
  - Thorough deep cleaning
  
- **Move In/Out**: https://images.unsplash.com/photo-1560518883-ce09059eeffa
  - Moving cleaning service
  
- **Office Cleaning**: https://images.unsplash.com/photo-1497366216548-37526070297c
  - Professional workspace cleaning
  
- **Carpet Cleaning**: https://images.unsplash.com/photo-1600585154526-990dced4b1ff
  - Carpet and upholstery cleaning
  
- **Custom Package**: https://images.unsplash.com/photo-1628177142898-93e36e4e3a50
  - Custom cleaning solutions

---

## Image Features

### All Images Include:
- ✅ Lazy loading for better performance
- ✅ Proper alt text for accessibility
- ✅ Hover effects with smooth transitions
- ✅ Responsive sizing
- ✅ Optimized dimensions from Unsplash

### Image Specifications:
- **Format**: JPG from Unsplash CDN
- **Optimization**: Auto-optimized by Unsplash
- **Dimensions**: 
  - Service cards: 600x400px
  - Booking cards: 400x300px
- **Loading**: Lazy loading enabled

---

## Benefits of Using Unsplash Images

1. **Free to use** - No attribution required
2. **High quality** - Professional photography
3. **CDN delivery** - Fast loading times
4. **Auto-optimization** - Unsplash handles image optimization
5. **Responsive** - Images adapt to different screen sizes

---

## How to Replace Images

### Option 1: Use Different Unsplash Images
1. Go to https://unsplash.com
2. Search for "cleaning service" or related terms
3. Copy the image URL
4. Replace the URL in the component file
5. Add `?w=600&h=400&fit=crop` for proper sizing

### Option 2: Use Local Images
1. Place your image in `public/images/services/`
2. Update the image path to `/images/services/your-image.jpg`
3. Ensure proper file naming (no spaces recommended)

---

## Notes

- All external images are loaded from Unsplash CDN
- Images are lazy-loaded to improve initial page load time
- Hover effects provide visual feedback
- Images scale smoothly on hover for better UX
