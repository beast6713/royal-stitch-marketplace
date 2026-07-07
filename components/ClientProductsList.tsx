"use client";

import dynamic from 'next/dynamic';

export const ClientProductsList = dynamic(
  () => import('./ProductsList').then(mod => mod.ProductsList),
  { ssr: false }
);
