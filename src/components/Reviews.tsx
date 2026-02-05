'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useState } from "react";

const reviews = [
  {
    name: "Sarah M.",
    rating: 5,
    text: "Very easy to book online and very helpful! Staff was very friendly, appointments as promised. I enjoyed how...",
  },
  {
    name: "John D.",
    rating: 5,
    text: "Excellent service! The booking process was seamless and the provider was professional and punctual.",
  },
  {
    name: "Emily R.",
    rating: 5,
    text: "I love how convenient this platform is. Found the perfect service provider in minutes!",
  },
  {
    name: "Michael T.",
    rating: 5,
    text: "Outstanding cleaning service! They were thorough, efficient, and left my home sparkling clean. Highly recommend their deep cleaning package!",
  },
  {
    name: "Lisa K.",
    rating: 5,
    text: "Best cleaning company I've ever used! Professional team, eco-friendly products, and amazing attention to detail. Will definitely book again!",
  },
  {
    name: "David P.",
    rating: 5,
    text: "Incredible service from start to finish! The team was punctual, respectful of my home, and did an amazing job. My carpets look brand new!",
  },
  {
    name: "Jennifer S.",
    rating: 5,
    text: "I'm so impressed with the quality of work! They went above and beyond my expectations. The post-construction cleaning was flawless. Thank you!",
  },
];

interface ReviewsProps {
  data?: {
    title?: string;
    reviews?: Array<{
      name?: string;
      text?: string;
      rating?: number;
    }>;
  };
}

export default function Reviews({ data }: ReviewsProps) {
  const [currentReview, setCurrentReview] = useState(0);
  const defaultReviews = [
    {
      name: "Sarah M.",
      rating: 5,
      text: "Very easy to book online and very helpful! Staff was very friendly, appointments as promised. I enjoyed how...",
    },
    {
      name: "John D.",
      rating: 5,
      text: "Excellent service! The booking process was seamless and the provider was professional and punctual.",
    },
    {
      name: "Emily R.",
      rating: 5,
      text: "I love how convenient this platform is. Found the perfect service provider in minutes!",
    },
  ];
  const reviews = data?.reviews && data.reviews.length > 0 ? data.reviews : defaultReviews;
  const title = data?.title || 'Live Reviews';

  return (
    <section id="reviews" className="py-16 bg-white">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <span className="text-primary font-semibold text-sm">SINCE 2015</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{title}</span>
          </h2>
        </div>

        <div className="relative animate-scale-in">
          <Card className="border-2 border-primary/30 card-shadow hover:shadow-2xl transition-shadow bg-gradient-to-br from-card to-primary/5 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 gradient-primary" />
            <CardContent className="p-10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold gradient-text">{reviews[currentReview].name.charAt(0)}</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">{reviews[currentReview]?.name || 'Customer'}</h3>
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(reviews[currentReview]?.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
                  ))}
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed">{reviews[currentReview]?.text || 'Great service!'}</p>
                <button className="text-primary mt-4 hover:underline font-semibold">Read more →</button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3 mt-8">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentReview(index)}
                className={`h-2 rounded-full transition-all hover:bg-primary/70 ${
                  currentReview === index ? "bg-primary w-10" : "bg-muted-foreground/30 w-2"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
