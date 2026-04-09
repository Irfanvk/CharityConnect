import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { charityClient } from '@/api/charityClient';
import { APP_BRAND, APP_IMAGES } from '@/config/appPaths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await charityClient.auth.forgotPassword(identifier.trim());
            setSubmitted(true);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden p-4 sm:p-6">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: [
                        'radial-gradient(circle at 12% 18%, rgba(250, 204, 21, 0.26), transparent 34%)',
                        'radial-gradient(circle at 86% 20%, rgba(45, 212, 191, 0.22), transparent 30%)',
                        'radial-gradient(circle at 80% 82%, rgba(59, 130, 246, 0.18), transparent 36%)',
                        'linear-gradient(145deg, #f8fafc 0%, #ecfeff 35%, #fefce8 68%, #fff7ed 100%)',
                    ].join(','),
                }}
            />

            <div className="relative z-10 flex min-h-svh items-center justify-center pb-[env(safe-area-inset-bottom)]">
                <Card className="w-full max-w-md border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
                    <CardHeader className="space-y-1">
                        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-white/80 p-2 shadow-md dark:bg-slate-800/80">
                            <img
                                src={APP_IMAGES.LOGOS.PRIMARY}
                                alt={`${APP_BRAND.NAME} logo`}
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <CardTitle className="text-2xl font-bold text-center text-emerald-900 dark:text-emerald-200">
                            Forgot Password
                        </CardTitle>
                        <CardDescription className="text-center text-emerald-800/80 dark:text-emerald-100/80">
                            Submit a request and an admin will send you a reset link via WhatsApp.
                        </CardDescription>
                    </CardHeader>

                    {submitted ? (
                        <CardContent className="py-8 text-center space-y-4">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                                Request submitted successfully!
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                An admin will review your request. If your account is found, you'll receive
                                a password reset link on your registered WhatsApp number.
                            </p>
                            <Link to="/login" className="inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                                Back to Sign In
                            </Link>
                        </CardContent>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="identifier" className="text-slate-800 dark:text-slate-100">
                                        Email, Username, or Phone Number
                                    </Label>
                                    <Input
                                        id="identifier"
                                        name="identifier"
                                        type="text"
                                        placeholder="Enter your email, username, or phone"
                                        value={identifier}
                                        onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                                        required
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading || !identifier.trim()}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Reset Request'
                                    )}
                                </Button>
                            </CardContent>
                        </form>
                    )}

                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-sm text-center text-slate-600 dark:text-slate-300">
                            <Link to="/login" className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                                Back to Sign In
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
