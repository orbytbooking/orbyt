'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { JobOpening } from '@/components/admin/JobOpeningsManager';

const JOB_OPENINGS_STORAGE_KEY = 'premier_pro_job_openings';

export default function JobOpeningPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [opening, setOpening] = useState<JobOpening | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(JOB_OPENINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const found = parsed.find((o: JobOpening) => o.slug === slug);
          setOpening(found || null);
        }
      }
    } catch (e) {
      console.error('Error loading job opening:', e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading job opening...</p>
        </div>
      </div>
    );
  }

  if (!opening) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Job Opening Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The job opening you're looking for doesn't exist or has been removed.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button asChild>
                <Link href="/job-application">View Application Form</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Image */}
      {opening.bannerImage?.enabled && opening.bannerImage?.url && (
        <div className="w-full h-64 md:h-96 relative overflow-hidden">
          <img 
            src={opening.bannerImage.url} 
            alt={opening.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center px-4">
              {opening.title}
            </h1>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Title (if no banner) */}
        {(!opening.bannerImage?.enabled || !opening.bannerImage?.url) && (
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{opening.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Posted: {new Date(opening.createdAt).toLocaleDateString()}</span>
              {opening.updatedAt !== opening.createdAt && (
                <span>Updated: {new Date(opening.updatedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        {/* First Icon */}
        {opening.firstIcon?.enabled && opening.firstIcon?.url && (
          <div className="mb-8 flex justify-center">
            <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-primary/20 shadow-lg">
              <img 
                src={opening.firstIcon.url} 
                alt="Job icon"
                className="w-full h-full object-contain p-4"
              />
            </div>
          </div>
        )}

        {/* Header Content */}
        {opening.headerContent && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div 
                className="prose prose-lg max-w-none [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_strong]:font-bold [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: opening.headerContent }}
              />
            </CardContent>
          </Card>
        )}

        {/* Application Section */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Ready to Apply?</h2>
                <p className="text-muted-foreground">
                  Complete the application form to apply for this position
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/job-application">
                    Apply Now
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/job-application">
                    <Download className="h-4 w-4 mr-2" />
                    Download Application Form
                  </Link>
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Position:</strong> {opening.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Reference ID:</strong> {opening.slug}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

