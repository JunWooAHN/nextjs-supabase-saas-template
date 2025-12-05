import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AuthCodeErrorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error || 'An error occurred during authentication';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle>Authentication Error</CardTitle>
            </div>
            <CardDescription>
              There was a problem signing you in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Please try the following:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Make sure you have an account with this email</li>
                <li>Try signing in again</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cookies and try again</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/login">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

