'use client'

import React from 'react';
import { Metadata } from 'next';
import Link from "next/link";
import { Github } from "lucide-react";

const TermsOfService = () => {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Hero Section */}
            <section className="w-full py-12 md:py-24 lg:py-32 bg-purple-50 dark:bg-purple-950">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">Terms of Service</h1>
                        <p className="max-w-[600px] text-purple-600 dark:text-purple-300 text-xl md:text-2xl">
                            Guidelines for using NeverForget
                        </p>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="w-full py-12 md:py-24 lg:py-32">
                <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Agreement to Terms</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                By accessing and using NeverForget, you agree to be bound by these Terms of Service and comply with all applicable laws and regulations.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Open Source License</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                NeverForget is an open-source project available on GitHub. The application is provided under the terms of our open-source license, which can be found in our GitHub repository at{' '}
                                <a 
                                    href="https://github.com/Sooraj002/neverForget" 
                                    className="text-purple-600 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-200 underline"
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    github.com/Sooraj002/neverForget
                                </a>
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">User Responsibilities</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">As a user of NeverForget, you agree to:</p>
                            <ul className="list-disc ml-6 space-y-3 text-gray-500 dark:text-gray-400 text-lg">
                                <li>Use the service in compliance with all applicable laws</li>
                                <li>Maintain the security of your account</li>
                                <li>Not misuse or attempt to harm the service</li>
                                <li>Respect the intellectual property rights of others</li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Service Availability</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                We strive to provide a reliable service, but we make no guarantees about its availability or functionality. As an open-source project, the service is provided "as is" without any warranties.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Modifications to Service</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                We reserve the right to modify or discontinue the service at any time. As an open-source project, major changes will be communicated through our GitHub repository.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Limitation of Liability</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Contact Information</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                For questions about these Terms of Service, please reach out through our GitHub repository or contact page.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full py-6 bg-gray-100 dark:bg-gray-900">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                            <Link href="/privacy-policy" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
                                Privacy Policy
                            </Link>
                            <Link href="/terms-of-service" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
                                Terms of Service
                            </Link>
                            <Link href="/contact" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
                                Contact
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="https://github.com/Sooraj002/neverForget"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                            >
                                <Github className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TermsOfService; 