'use client'

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Brain, Share2, Search, Settings, Smartphone, Github } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-purple-50 dark:bg-purple-950">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_500px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">NeverForget</h1>
                <p className="text-purple-600 dark:text-purple-300 text-xl md:text-2xl">
                  Open Source Assistive Technology for Memory Challenges
                </p>
                <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                  An open-source project dedicated to helping people capture thoughts, memories, and important information through quick voice recordings, automatically transcribed and summarized for easy future reference.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => window.open('https://github.com/Sooraj002/neverForget', '_blank')}
                >
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </Button>
                <Link href="/contact">
                  <Button variant="outline">Get Involved</Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative h-[500px] w-[250px] overflow-hidden rounded-xl border-8 border-gray-800 bg-gray-800 shadow-xl">
                <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900">
                  <Image
                    src="/homeScreen.png"
                    width={250}
                    height={450}
                    alt="NeverForget App Screenshot"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Purpose Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Purpose & Vision</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                NeverForget is an open-source initiative aimed at helping individuals with memory difficulties maintain independence, provide cognitive support for people with ADHD, and assist dementia patients in preserving and accessing their memories.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Brain className="h-8 w-8 text-purple-600" />
                <CardTitle>Memory Support</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Help individuals with memory difficulties maintain independence and reduce anxiety about forgetting
                  important information.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Mic className="h-8 w-8 text-purple-600" />
                <CardTitle>Quick Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Seamlessly capture thoughts and memories through quick voice recordings with just one tap.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Share2 className="h-8 w-8 text-purple-600" />
                <CardTitle>Community-Driven</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  An open-source project that welcomes contributions from developers who want to make a difference in people's lives.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Core Features</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                NeverForget combines cutting-edge AI technology with an accessible interface to provide comprehensive
                memory support.
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Mic className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-bold">Quick Capture System</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                10-second default recording duration (expandable up to 10 minutes) with one-tap activation and automatic
                background upload.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Brain className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-bold">AI-Powered Summarization</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Google Gemini integration for concise summaries with key points extraction and context preservation.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Search className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-bold">Advanced Transcription</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                OpenAI Whisper integration with multiple model options and multi-language support.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-bold">Memory Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Categorized memory storage with easy search and retrieval, sharing functionality, and backup
                capabilities.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Smartphone className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-bold">Accessibility-First Design</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                High-contrast visual elements, large readable text, and simple intuitive navigation designed for users
                with cognitive challenges.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Share2 className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-bold">Sharing Capabilities</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Easily share memories and important information with caregivers and family members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Powered By</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                NeverForget leverages cutting-edge technology to provide the best experience.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-4 items-center justify-center mt-8">
            <div className="flex flex-col items-center justify-center space-y-2 p-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                <Image
                  src="/reactNative.png"
                  width={64}
                  height={64}
                  alt="React Native"
                  className="h-8 w-8"
                />
              </div>
              <p className="text-center font-medium">React Native</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 p-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                <Image
                  src="/nodejs.png"
                  width={64}
                  height={64}
                  alt="Node.js"
                  className="h-8 w-8"
                />
              </div>
              <p className="text-center font-medium">Node.js</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 p-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                <Image
                  src="/whisper.png"
                  width={64}
                  height={64}
                  alt="OpenAI Whisper"
                  className="h-8 w-8"
                />
              </div>
              <p className="text-center font-medium">OpenAI Whisper</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 p-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                <Image
                  src="/gemini.png"
                  width={64}
                  height={64}
                  alt="Google Gemini"
                  className="h-8 w-8"
                />
              </div>
              <p className="text-center font-medium">Google Gemini</p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-purple-50 dark:bg-purple-950">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Get Started Today</h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Join our open-source community and start contributing to NeverForget.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => window.open('https://github.com/Sooraj002/neverForget', '_blank')}
                >
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </Button>
                <Link href="/contact">
                  <Button variant="outline">Join the Community</Button>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Quick Start Guide</h3>
              <ol className="space-y-2">
                <li className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                    1
                  </div>
                  <p className="ml-2 text-gray-500 dark:text-gray-400">Clone the repository from GitHub</p>
                </li>
                <li className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                    2
                  </div>
                  <p className="ml-2 text-gray-500 dark:text-gray-400">Follow the setup instructions in README</p>
                </li>
                <li className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                    3
                  </div>
                  <p className="ml-2 text-gray-500 dark:text-gray-400">
                    Install dependencies and start the development server
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                    4
                  </div>
                  <p className="ml-2 text-gray-500 dark:text-gray-400">Start contributing to the project</p>
                </li>
              </ol>
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
  )
}
