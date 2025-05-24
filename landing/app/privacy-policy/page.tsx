'use client'

import React from 'react';
import { Metadata } from 'next';
import Link from "next/link";
import { Github } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-purple-50 dark:bg-purple-950">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">Privacy Policy</h1>
            <p className="max-w-[600px] text-purple-600 dark:text-purple-300 text-xl md:text-2xl">
              How we handle and protect your data
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Introduction</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                NeverForget is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our open-source todo application.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Information We Collect</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">We collect information that you voluntarily provide to us when you:</p>
              <ul className="list-disc ml-6 space-y-3 text-gray-500 dark:text-gray-400 text-lg">
                <li>Create an account</li>
                <li>Use our application features</li>
                <li>Contact us for support</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">How We Use Your Information</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">We use the collected information to:</p>
              <ul className="list-disc ml-6 space-y-3 text-gray-500 dark:text-gray-400 text-lg">
                <li>Provide and maintain our services</li>
                <li>Improve user experience</li>
                <li>Communicate with you about updates and changes</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Data Security</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                As an open-source project, we prioritize transparency and security. Our code is publicly available for review on GitHub, and we implement industry-standard security measures to protect your data.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Changes to This Policy</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">Contact Us</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                If you have any questions about this Privacy Policy, please contact us through our GitHub repository or contact page.
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

export default PrivacyPolicy; 