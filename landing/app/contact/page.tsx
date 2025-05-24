'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

const Contact = () => {
  const team = [
    {
      name: "Sooraj Bhaskar Nambiar",
      role: "Developer",
      linkedin: "https://www.linkedin.com/in/sooraj-bhaskar-nambiar/",
      twitter: "https://x.com/404sooraj"
    },
    {
      name: "Krish",
      role: "Developer",
      linkedin: "https://www.linkedin.com/in/krishkh/",
      twitter: "https://x.com/krishk317"
    },
    {
      name: "Arsh Ahmad",
      role: "Designer",
      linkedin: "https://www.linkedin.com/in/arsh-ahmad/",
      twitter: "https://x.com/realArshAhmad"
    },
    {
      name: "Abhinav Chaudhary",
      role: "Designer",
      linkedin: "https://www.linkedin.com/in/abhinav-chaudhary-a7b871291/",
      twitter: "https://x.com/notabhinv_"
    }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-purple-50 dark:bg-purple-950">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">Contact Us</h1>
            <p className="max-w-[600px] text-purple-600 dark:text-purple-300 text-xl md:text-2xl">
              Connect with our team and join the community
            </p>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Have questions, suggestions, or want to contribute to NeverForget? We'd love to hear from you!
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Meet the Team</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              The creators behind NeverForget
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900">
                <div className="space-y-2 text-center">
                  <h3 className="text-xl font-bold text-foreground">{member.name}</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-300">{member.role}</p>
                </div>
                <div className="flex space-x-4">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300 transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href={member.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300 transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-purple-50 dark:bg-purple-950">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Contribute on GitHub</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Join our open-source community and help make NeverForget even better
            </p>
            <ul className="list-none text-center space-y-2 text-gray-500 dark:text-gray-400 mt-4">
              <li>🐛 Report issues or bugs</li>
              <li>💡 Submit feature requests</li>
              <li>🤝 Contribute to the project</li>
              <li>⭐ Star the repository</li>
            </ul>
            <Button
              className="mt-8 bg-purple-600 hover:bg-purple-700"
              onClick={() => window.open('https://github.com/Sooraj002/neverForget', '_blank')}
            >
              <Github className="mr-2 h-5 w-5" />
              Visit GitHub Repository
            </Button>
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

export default Contact; 